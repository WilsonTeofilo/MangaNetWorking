package com.manganetworking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MangaNetWorkingApplication {

    public static void main(String[] args) {
        SpringApplication.run(MangaNetWorkingApplication.class, args);
    }
}
