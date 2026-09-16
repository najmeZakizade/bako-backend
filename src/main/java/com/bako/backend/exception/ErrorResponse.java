package com.bako.backend.exception;

import java.time.LocalDateTime;

public class ErrorResponse {
    private String message;
    private int status;
    private String error;
    private String path;
    private LocalDateTime timestamp;

    // سازنده، getter و setter
    public ErrorResponse(String message, int status, String error, String path) {
        this.message = message;
        this.status = status;
        this.error = error;
        this.path = path;
        this.timestamp = LocalDateTime.now();
    }

    // getter و setter
}