import { useState, useCallback, useEffect, useMemo, ChangeEvent } from 'react';
import { useApi, fetchApiRef, configApiRef, discoveryApiRef } from '@backstage/core-plugin-api';
import {
  Progress,
  ResponseErrorPanel,
} from '@backstage/core-components';
import { 
  FormControl, 
  TextField, 
  Typography, 
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Box,
  Chip,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import type { JsonObject } from '@backstage/types';
import type { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';

type SpringInitializerMetadata = {
  type: {
    default: string;
    values: Array<{ id: string; name: string }>;
  };
  language: {
    default: string;
    values: Array<{ id: string; name: string }>;
  };
  bootVersion: {
    default: string;
    values: Array<{ id: string; name: string }>;
  };
  packaging: {
    default: string;
    values: Array<{ id: string; name: string }>;
  };
  javaVersion: {
    default: string;
    values: Array<{ id: string; name: string }>;
  };
  groupId: {
    default: string;
  };
  artifactId: {
    default: string;
  };
  version: {
    default: string;
  };
  name: {
    default: string;
  };
  description: {
    default: string;
  };
  packageName: {
    default: string;
  };
  dependencies: {
    values: Array<{
      name: string;
      values: Array<{
        id: string;
        name: string;
        description?: string;
        versionRange?: string;
      }>;
    }>;
  };
};

export const SpringInitializerForm = ({
  onChange,
}: FieldExtensionComponentProps<JsonObject>): JSX.Element => {
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<SpringInitializerMetadata | null>(null);
  const [error, setError] = useState<Error>();
  const [selectedDependencies, setSelectedDependencies] = useState<Set<string>>(new Set());
  
  // Form state
  const [projectType, setProjectType] = useState('');
  const [language, setLanguage] = useState('');
  const [bootVersion, setBootVersion] = useState('');
  const [groupId, setGroupId] = useState('');
  const [artifactId, setArtifactId] = useState('');
  const [version, setVersion] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [packageName, setPackageName] = useState('');
  const [packaging, setPackaging] = useState('');
  const [javaVersion, setJavaVersion] = useState('');

  const fetchApi = useApi(fetchApiRef);
  const config = useApi(configApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  
  // Read admin configuration (memoized to prevent recreation on every render)
  // Using completely flat structure
  const configDefaults = useMemo(() => {
    const readFieldConfig = (fieldName: string) => {
      const capitalizedField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
      const value = config.getOptionalString(`springInitializer.default${capitalizedField}`);
      const readOnly = config.getOptionalBoolean(`springInitializer.default${capitalizedField}ReadOnly`) || false;
      return { value, readOnly };
    };
    
    const defaults = {
      groupId: readFieldConfig('groupId'),
      bootVersion: readFieldConfig('bootVersion'),
      javaVersion: readFieldConfig('javaVersion'),
      packaging: readFieldConfig('packaging'),
      type: readFieldConfig('type'),
      language: readFieldConfig('language'),
    };
    
    return defaults;
  }, [config]);
  
  const requiredDependencies = useMemo(() => 
    config.getOptionalStringArray('springInitializer.requiredDependencies') || [], 
    [config]
  );
  
  const disallowedDependencies = useMemo(() => 
    config.getOptionalStringArray('springInitializer.disallowedDependencies') || [], 
    [config]
  );
  
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        
        // Use Backstage proxy to avoid CORS issues
        const backendUrl = await discoveryApi.getBaseUrl('proxy');
        const proxyPath = config.getOptionalString('springInitializer.proxyPath') || '/spring-initializer';
        
        const response = await fetchApi.fetch(`${backendUrl}${proxyPath}`, {
          headers: {
            'Accept': 'application/vnd.initializr.v2.2+json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch Spring Initializer metadata: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setMetadata(data);
        
        // Initialize form with defaults (config overrides API defaults)
        setProjectType(configDefaults.type.value || data.type?.default || 'maven-project');
        setLanguage(configDefaults.language.value || data.language?.default || 'java');
        setBootVersion(configDefaults.bootVersion.value || data.bootVersion?.default || '3.5.10');
        setGroupId(configDefaults.groupId.value || data.groupId?.default || 'com.example');
        setArtifactId(data.artifactId?.default || 'demo');
        setVersion(data.version?.default || '0.0.1-SNAPSHOT');
        setName(data.name?.default || 'demo');
        setDescription(data.description?.default || 'Demo project for Spring Boot');
        setPackageName(data.packageName?.default || 'com.example.demo');
        setPackaging(configDefaults.packaging.value || data.packaging?.default || 'jar');
        setJavaVersion(configDefaults.javaVersion.value || data.javaVersion?.default || '17');
        
        // Initialize required dependencies
        if (requiredDependencies.length > 0) {
          setSelectedDependencies(new Set(requiredDependencies));
        }
        
        setError(undefined);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [discoveryApi, config, fetchApi, configDefaults, requiredDependencies]);

  // Update output whenever form changes
  const updateOutput = useCallback(() => {
    const output: JsonObject = {
      type: projectType,
      language,
      bootVersion,
      groupId,
      artifactId,
      version,
      name,
      description,
      packageName,
      packaging,
      javaVersion,
      dependencies: Array.from(selectedDependencies).join(','),
    };
    
    onChange(output);
  }, [projectType, language, bootVersion, groupId, artifactId, version, name, description, packageName, packaging, javaVersion, selectedDependencies, onChange]);

  useEffect(() => {
    updateOutput();
  }, [updateOutput]);

  // Function to check if a dependency is compatible with the selected boot version
  const isDependencyCompatible = useCallback((versionRange: string | undefined): boolean => {
    if (!versionRange || !bootVersion) return true;

    // Parse version with suffix information
    // Returns [major, minor, patch, suffixType, suffixNumber]
    // suffixType: 0=final/release, -1=snapshot, -2=milestone, -3=RC
    const parseVersion = (v: string): number[] => {
      let suffixType = 0;
      let suffixNum = 0;
      let clean = v;

      // Check for snapshot (lowest priority)
      if (v.includes('-SNAPSHOT')) {
        suffixType = -1;
        clean = v.replace('-SNAPSHOT', '');
      }
      // Check for milestone
      else if (v.match(/-M(\d+)/)) {
        const match = v.match(/-M(\d+)/);
        suffixType = -2;
        suffixNum = match ? parseInt(match[1], 10) : 0;
        clean = v.replace(/-M\d+/, '');
      }
      // Check for RC
      else if (v.match(/-RC(\d+)/)) {
        const match = v.match(/-RC(\d+)/);
        suffixType = -3;
        suffixNum = match ? parseInt(match[1], 10) : 0;
        clean = v.replace(/-RC\d+/, '');
      }

      const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
      // Pad to ensure we have major.minor.patch
      while (parts.length < 3) parts.push(0);
      
      return [...parts, suffixType, suffixNum];
    };

    const compareVersions = (v1: number[], v2: number[]): number => {
      // Compare major.minor.patch first
      for (let i = 0; i < 3; i++) {
        if (v1[i] > v2[i]) return 1;
        if (v1[i] < v2[i]) return -1;
      }
      
      // If base versions are equal, compare suffix types
      // 0 (final) > -3 (RC) > -2 (M) > -1 (SNAPSHOT)
      const suffix1Type = v1[3] || 0;
      const suffix2Type = v2[3] || 0;
      
      if (suffix1Type > suffix2Type) return 1;
      if (suffix1Type < suffix2Type) return -1;
      
      // If suffix types are equal, compare suffix numbers
      const suffix1Num = v1[4] || 0;
      const suffix2Num = v2[4] || 0;
      
      if (suffix1Num > suffix2Num) return 1;
      if (suffix1Num < suffix2Num) return -1;
      
      return 0;
    };

    const currentVersion = parseVersion(bootVersion);

    // Handle simple "min" format (e.g., "4.0.0")
    if (!versionRange.includes('[') && !versionRange.includes(',')) {
      const minVersion = parseVersion(versionRange);
      return compareVersions(currentVersion, minVersion) >= 0;
    }

    // Handle range format [min,max) or [min,max]
    const match = versionRange.match(/(\[|\()([^,]+),([^\]]+)(\]|\))/);
    if (!match) return true;

    const [, leftBracket, minVer, maxVer, rightBracket] = match;
    const minVersion = parseVersion(minVer);
    const maxVersion = parseVersion(maxVer);

    const minCompare = compareVersions(currentVersion, minVersion);
    const maxCompare = compareVersions(currentVersion, maxVersion);

    const minOk = leftBracket === '[' ? minCompare >= 0 : minCompare > 0;
    const maxOk = rightBracket === ']' ? maxCompare <= 0 : maxCompare < 0;

    return minOk && maxOk;
  }, [bootVersion]);

  const handleDependencyToggle = useCallback((depId: string, versionRange: string | undefined) => {
    // Don't allow toggling incompatible dependencies
    if (!isDependencyCompatible(versionRange)) {
      return;
    }
    
    // Don't allow removing required dependencies
    if (requiredDependencies.includes(depId)) {
      return;
    }
    
    setSelectedDependencies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(depId)) {
        newSet.delete(depId);
      } else {
        newSet.add(depId);
      }
      return newSet;
    });
  }, [isDependencyCompatible, requiredDependencies]);

  // Auto-remove incompatible dependencies when boot version changes
  useEffect(() => {
    if (!metadata) return;
    
    setSelectedDependencies(prev => {
      const newSet = new Set<string>();
      
      // Always include required dependencies
      requiredDependencies.forEach(depId => newSet.add(depId));
      
      prev.forEach(depId => {
        // Skip if already added as required
        if (newSet.has(depId)) return;
        
        // Find the dependency to check its versionRange
        let versionRange: string | undefined;
        metadata.dependencies?.values.forEach(category => {
          const dep = category.values.find(d => d.id === depId);
          if (dep) {
            versionRange = dep.versionRange;
          }
        });
        
        // Only keep compatible dependencies
        if (isDependencyCompatible(versionRange)) {
          newSet.add(depId);
        }
      });
      return newSet;
    });
  }, [bootVersion, metadata, isDependencyCompatible, requiredDependencies]);

  const handleRemoveDependency = (depId: string) => {
    // Don't allow removing required dependencies
    if (requiredDependencies.includes(depId)) {
      return;
    }
    
    setSelectedDependencies(prev => {
      const newSet = new Set(prev);
      newSet.delete(depId);
      return newSet;
    });
  };

  if (loading) {
    return <Progress />;
  }

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  if (!metadata) {
    return <Typography>No metadata available</Typography>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Spring Boot Project Configuration
      </Typography>

      {/* Project Type */}
      <FormControl fullWidth margin="normal">
        <FormLabel>Project Type{configDefaults.type.readOnly && ' (Read-only)'}</FormLabel>
        <Select
          value={projectType}
          onChange={(e) => setProjectType(e.target.value as string)}
          disabled={configDefaults.type.readOnly}
        >
          {metadata.type?.values.map((type) => (
            <MenuItem key={type.id} value={type.id}>
              {type.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Language */}
      <FormControl fullWidth margin="normal">
        <FormLabel>Language{configDefaults.language.readOnly && ' (Read-only)'}</FormLabel>
        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value as string)}
          disabled={configDefaults.language.readOnly}
        >
          {metadata.language?.values.map((lang) => (
            <MenuItem key={lang.id} value={lang.id}>
              {lang.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Spring Boot Version */}
      <FormControl fullWidth margin="normal">
        <FormLabel>Spring Boot Version{configDefaults.bootVersion.readOnly && ' (Read-only)'}</FormLabel>
        <Select
          value={bootVersion}
          onChange={(e) => setBootVersion(e.target.value as string)}
          disabled={configDefaults.bootVersion.readOnly}
        >
          {metadata.bootVersion?.values.map((ver) => (
            <MenuItem key={ver.id} value={ver.id}>
              {ver.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Project Metadata Section */}
      <Typography variant="subtitle1" style={{ marginTop: 16, marginBottom: 8 }}>
        Project Metadata
      </Typography>
      
      <TextField
        label={`Group${configDefaults.groupId.readOnly ? ' (Read-only)' : ''}`}
        helperText="e.g., com.example"
        value={groupId}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setGroupId(e.target.value)}
        fullWidth
        margin="normal"
        disabled={configDefaults.groupId.readOnly}
      />

      <TextField
        label="Artifact"
        helperText="e.g., demo"
        value={artifactId}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setArtifactId(e.target.value)}
        fullWidth
        margin="normal"
      />

      <TextField
        label="Name"
        helperText="Project name"
        value={name}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        fullWidth
        margin="normal"
      />

      <TextField
        label="Description"
        helperText="Project description"
        value={description}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
        fullWidth
        margin="normal"
      />

      <TextField
        label="Package Name"
        helperText="e.g., com.example.demo"
        value={packageName}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setPackageName(e.target.value)}
        fullWidth
        margin="normal"
      />

      <TextField
        label="Version"
        helperText="Project version"
        value={version}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setVersion(e.target.value)}
        fullWidth
        margin="normal"
      />

      {/* Packaging */}
      <FormControl fullWidth margin="normal">
        <FormLabel>Packaging{configDefaults.packaging.readOnly && ' (Read-only)'}</FormLabel>
        <Select
          value={packaging}
          onChange={(e) => setPackaging(e.target.value as string)}
          disabled={configDefaults.packaging.readOnly}
        >
          {metadata.packaging?.values.map((pack) => (
            <MenuItem key={pack.id} value={pack.id}>
              {pack.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Java Version */}
      <FormControl fullWidth margin="normal">
        <FormLabel>Java Version{configDefaults.javaVersion.readOnly && ' (Read-only)'}</FormLabel>
        <Select
          value={javaVersion}
          onChange={(e) => setJavaVersion(e.target.value as string)}
          disabled={configDefaults.javaVersion.readOnly}
        >
          {metadata.javaVersion?.values.map((jv) => (
            <MenuItem key={jv.id} value={jv.id}>
              {jv.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Selected Dependencies */}
      {selectedDependencies.size > 0 && (
        <Box marginTop={2} marginBottom={2}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Dependencies ({selectedDependencies.size})
          </Typography>
          <Box display="flex" flexWrap="wrap" style={{ gap: '8px' }}>
            {Array.from(selectedDependencies).map(depId => {
              // Find the dependency name
              let depName = depId;
              metadata.dependencies?.values.forEach(category => {
                const dep = category.values.find(d => d.id === depId);
                if (dep) {
                  depName = dep.name;
                }
              });
              
              const isRequired = requiredDependencies.includes(depId);
              
              return (
                <Chip
                  key={depId}
                  label={`${depName}${isRequired ? ' (Required)' : ''}`}
                  onDelete={isRequired ? undefined : () => handleRemoveDependency(depId)}
                  color="primary"
                  size="small"
                />
              );
            })}
          </Box>
        </Box>
      )}

      {/* Dependencies */}
      <Typography variant="subtitle1" style={{ marginTop: 16, marginBottom: 8 }}>
        Dependencies
      </Typography>
      
      {metadata.dependencies?.values.map((category) => {
        // Show all dependencies with their status
        return (
          <Accordion key={category.name}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                {category.name} ({category.values.filter(dep => 
                  isDependencyCompatible(dep.versionRange) && 
                  !disallowedDependencies.includes(dep.id)
                ).length}/{category.values.length} available)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {category.values.map((dep) => {
                  const isRequired = requiredDependencies.includes(dep.id);
                  const isDisallowed = disallowedDependencies.includes(dep.id);
                  const isCompatible = isDependencyCompatible(dep.versionRange);
                  const isDisabled = isRequired || isDisallowed || !isCompatible;
                  
                  // Determine the reason label
                  let reasonLabel = null;
                  if (isRequired) {
                    reasonLabel = (
                      <Typography variant="caption" color="primary" style={{ marginLeft: 8, fontWeight: 'bold' }}>
                        (Required)
                      </Typography>
                    );
                  } else if (isDisallowed) {
                    reasonLabel = (
                      <Typography variant="caption" style={{ marginLeft: 8, color: '#d32f2f', fontWeight: 'bold' }}>
                        (Disallowed by policy)
                      </Typography>
                    );
                  } else if (!isCompatible && dep.versionRange) {
                    reasonLabel = (
                      <Typography variant="caption" style={{ marginLeft: 8, color: '#f57c00', fontWeight: 'bold' }}>
                        (Incompatible: requires {dep.versionRange})
                      </Typography>
                    );
                  }
                  
                  return (
                    <FormControlLabel
                      key={dep.id}
                      control={
                        <Checkbox
                          checked={selectedDependencies.has(dep.id)}
                          onChange={() => handleDependencyToggle(dep.id, dep.versionRange)}
                          color="primary"
                          disabled={isDisabled}
                        />
                      }
                      disabled={isDisabled && !isRequired}
                      label={
                        <Box style={{ opacity: isDisabled && !isRequired ? 0.6 : 1 }}>
                          <Typography variant="body2">
                            {dep.name}
                            {reasonLabel}
                          </Typography>
                          {dep.description && (
                            <Typography variant="caption" color="textSecondary">
                              {dep.description}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  );
                })}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};
