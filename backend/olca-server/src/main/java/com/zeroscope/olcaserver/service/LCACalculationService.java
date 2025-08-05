package com.zeroscope.olcaserver.service;

import org.openlca.jsonld.ZipStore;
import org.openlca.core.model.ModelType;
import org.openlca.core.model.Process;
import org.openlca.core.model.ImpactMethod;
import org.openlca.jsonld.Json;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import com.google.gson.JsonObject;

@Service
public class LCACalculationService {
    private static final Logger logger = LoggerFactory.getLogger(LCACalculationService.class);
    private ZipStore databaseStore;

    public void loadDatabase() {
        try {
            String dataPath = System.getenv("OLCA_DATA_PATH") != null 
                ? System.getenv("OLCA_DATA_PATH")
                : "data/database.jsonld.zip";
            Path jsonLdPath = Paths.get(dataPath);
            databaseStore = ZipStore.open(jsonLdPath.toFile());
            logger.info("Database loaded successfully from: {}", jsonLdPath);
        } catch (Exception e) {
            logger.error("Failed to load database", e);
            throw new RuntimeException("Database loading failed", e);
        }
    }

    public List<Map<String, String>> getAllProcesses() {
        List<Map<String, String>> processes = new ArrayList<>();
        try {
            for (String id : databaseStore.getRefIds(ModelType.PROCESS)) {
                JsonObject json = databaseStore.get(ModelType.PROCESS, id);
                if (json != null) {
                    Map<String, String> process = new HashMap<>();
                    process.put("id", id);
                    process.put("name", Json.getString(json, "name"));
                    process.put("description", Json.getString(json, "description"));
                    processes.add(process);
                }
            }
        } catch (Exception e) {
            logger.error("Error getting processes", e);
        }
        return processes;
    }

    public List<Map<String, String>> getAllImpactMethods() {
        List<Map<String, String>> methods = new ArrayList<>();
        try {
            for (String id : databaseStore.getRefIds(ModelType.IMPACT_METHOD)) {
                JsonObject json = databaseStore.get(ModelType.IMPACT_METHOD, id);
                if (json != null) {
                    Map<String, String> method = new HashMap<>();
                    method.put("id", id);
                    method.put("name", Json.getString(json, "name"));
                    method.put("description", Json.getString(json, "description"));
                    methods.add(method);
                }
            }
        } catch (Exception e) {
            logger.error("Error getting impact methods", e);
        }
        return methods;
    }

    public Map<String, Object> getProcessDetails(String id) {
        Map<String, Object> details = new HashMap<>();
        try {
            JsonObject json = databaseStore.get(ModelType.PROCESS, id);
            if (json != null) {
                details.put("id", id);
                details.put("name", Json.getString(json, "name"));
                details.put("description", Json.getString(json, "description"));
                // Add other fields as needed
            }
        } catch (Exception e) {
            logger.error("Error getting process details", e);
        }
        return details;
    }

    public boolean isDatabaseLoaded() {
        return databaseStore != null;
    }
}