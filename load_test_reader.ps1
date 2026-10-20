param(
    [Parameter(Mandatory = $true)][string]$WorkSlug,
    [Parameter(Mandatory = $true)][ValidateRange(1, 100000)][int]$ChapterNumber,
    [string]$BaseUrl = 'http://127.0.0.1:8085/api',
    [ValidateRange(1, 10000)][int]$Requests = 200,
    [ValidateRange(1, 500)][int]$Concurrency = 20,
    [string]$Cookie = ''
)

$ErrorActionPreference = 'Stop'
$readerUrl = "$($BaseUrl.TrimEnd('/'))/works/$WorkSlug/chapters/$ChapterNumber"
$headers = @{}
if ($Cookie) { $headers.Cookie = $Cookie }
$chapter = Invoke-RestMethod -Uri $readerUrl -Headers $headers -TimeoutSec 20
$pagePaths = @($chapter.pagesJson | ConvertFrom-Json)
if ($pagePaths.Count -eq 0) {
    throw 'O capítulo não contém páginas. A carga do leitor exige páginas reais do storage.'
}

Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(20)
$cookieValue = $Cookie
if ($cookieValue) { $client.DefaultRequestHeaders.Add('Cookie', $cookieValue) }
$pageUris = @($pagePaths | ForEach-Object {
    if ($_ -match '^https?://') { [Uri]$_ } else { [Uri]::new([Uri]($BaseUrl.TrimEnd('/') + '/'), $_) }
})
$loadSource = @'
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
public sealed class ReaderLoadResult {
    public int Successful { get; set; }
    public int Failed { get; set; }
    public double DurationSeconds { get; set; }
    public double RequestsPerSecond { get; set; }
    public double P95Milliseconds { get; set; }
    public string[] SampleErrors { get; set; }
}
public static class ReaderLoadRunner {
    public static ReaderLoadResult Run(string url, int count, int concurrency, string cookie) {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(20) };
        if (!String.IsNullOrWhiteSpace(cookie)) client.DefaultRequestHeaders.Add("Cookie", cookie);
        using var gate = new SemaphoreSlim(concurrency, concurrency);
        var latencies = new ConcurrentBag<double>();
        var errors = new ConcurrentBag<string>();
        var timer = Stopwatch.StartNew();
        var tasks = Enumerable.Range(0, count).Select(_ => Task.Run(async () => {
            await gate.WaitAsync();
            try {
                var watch = Stopwatch.StartNew();
                using var response = await client.GetAsync(url);
                watch.Stop();
                if (!response.IsSuccessStatusCode) errors.Add("HTTP " + (int)response.StatusCode);
                else latencies.Add(watch.Elapsed.TotalMilliseconds);
            } catch (Exception ex) { errors.Add(ex.GetType().Name + ": " + ex.Message); }
            finally { gate.Release(); }
        })).ToArray();
        Task.WaitAll(tasks);
        timer.Stop();
        var ordered = latencies.OrderBy(value => value).ToArray();
        var p95Index = ordered.Length == 0 ? 0 : Math.Min(ordered.Length - 1, (int)Math.Ceiling(ordered.Length * 0.95) - 1);
        return new ReaderLoadResult {
            Successful = ordered.Length, Failed = errors.Count,
            DurationSeconds = Math.Round(timer.Elapsed.TotalSeconds, 2),
            RequestsPerSecond = timer.Elapsed.TotalSeconds > 0 ? Math.Round(count / timer.Elapsed.TotalSeconds, 2) : 0,
            P95Milliseconds = ordered.Length > 0 ? Math.Round(ordered[p95Index], 2) : 0,
            SampleErrors = errors.Take(5).ToArray()
        };
    }
}
'@
Add-Type -TypeDefinition $loadSource
$result = [ReaderLoadRunner]::Run($pageUris[0].AbsoluteUri, $Requests, $Concurrency, $Cookie)
[pscustomobject]@{
    ChapterEndpoint = $readerUrl
    PageCount = $pageUris.Count
    Requests = $Requests
    Concurrency = $Concurrency
    Successful = $result.Successful
    Failed = $result.Failed
    DurationSeconds = $result.DurationSeconds
    RequestsPerSecond = $result.RequestsPerSecond
    P95Milliseconds = $result.P95Milliseconds
    SampleErrors = @($result.SampleErrors)
} | Format-List
if ($result.Failed -gt 0) { exit 1 }
