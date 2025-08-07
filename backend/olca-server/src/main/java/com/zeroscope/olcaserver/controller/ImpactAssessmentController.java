package com.zeroscope.olcaserver.controller;

import com.zeroscope.olcaserver.service.LCACalculationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/database")
@CrossOrigin(origins = "*")
public class ImpactAssessmentController {

    @Autowired
    private LCACalculationService lcaService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", lcaService.isDatabaseLoaded() ? "healthy" : "unhealthy",
            "databaseLoaded", lcaService.isDatabaseLoaded()
        ));
    }

    @GetMapping("/processes")
    public ResponseEntity<List<Map<String, String>>> getAllProcesses() {
        if (!lcaService.isDatabaseLoaded()) {
            lcaService.loadDatabase();
        }
        return ResponseEntity.ok(lcaService.getAllProcesses());
    }

    @GetMapping("/methods")
    public ResponseEntity<List<Map<String, String>>> getAllImpactMethods() {
        return ResponseEntity.ok(lcaService.getAllImpactMethods());
    }

    @GetMapping("/process/{id}")
    public ResponseEntity<Map<String, Object>> getProcessDetails(@PathVariable String id) {
        Map<String, Object> details = lcaService.getProcessDetails(id);
        if (details.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(details);
    }
}