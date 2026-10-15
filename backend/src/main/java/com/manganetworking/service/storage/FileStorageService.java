package com.manganetworking.service.storage;

public interface FileStorageService {
    String storeFile(byte[] fileBytes, String originalFilename, String contentType);
    byte[] loadFile(String filename);
    void deleteFile(String filename);
    boolean exists(String filename);
}
