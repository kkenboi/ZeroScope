package com.zeroscope.olcaserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties
public class OlcaServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(OlcaServerApplication.class, args);
    }
}