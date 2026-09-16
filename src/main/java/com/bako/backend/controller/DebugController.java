package com.bako.backend.controller;

import com.bako.backend.utils.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/debug")
public class DebugController {

    @GetMapping("/tenant")
    public ResponseEntity<Map<String, Object>> getTenant() {
        Map<String, Object> result = new HashMap<>();
        try {
            String tenantId = SecurityUtils.getCurrentTenantId();
            result.put("tenantId", tenantId);
            result.put("status", tenantId != null ? "OK" : "FAIL");
            result.put("message", tenantId != null ? "tenantId دریافت شد." : "tenantId دریافت نشد.");
        } catch (Exception e) {
            result.put("status", "ERROR");
            result.put("message", e.getMessage());
        }
        return ResponseEntity.ok(result);
    }
}