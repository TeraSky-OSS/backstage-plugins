import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { resolveSafeChildPath } from '@backstage/backend-plugin-api';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';

export function createSpringInitializerAction({ config }: { config: any }) {
  return createTemplateAction({
    id: 'terasky:spring-initializer',
    description: 'Generate a Spring Boot project using Spring Initializer',
    schema: {
      input: {
        type: z => z.string().optional().describe('Project type (maven-project, gradle-project, gradle-project-kotlin)'),
        language: z => z.string().optional().describe('Language (java, kotlin, groovy)'),
        bootVersion: z => z.string().optional().describe('Spring Boot version'),
        groupId: z => z.string().optional().describe('Group ID'),
        artifactId: z => z.string().optional().describe('Artifact ID'),
        version: z => z.string().optional().describe('Version'),
        name: z => z.string().optional().describe('Name'),
        description: z => z.string().optional().describe('Description'),
        packageName: z => z.string().optional().describe('Package name'),
        packaging: z => z.string().optional().describe('Packaging (jar, war)'),
        javaVersion: z => z.string().optional().describe('Java version (17, 21, 25)'),
        dependencies: z => z.string().optional().describe('Comma-separated list of dependency IDs'),
        outputPath: z => z.string().optional().describe('Output path relative to workspace'),
        endpoint: z => z.string().optional().describe('Spring Initializer endpoint URL'),
      },
      output: {
        projectPath: z => z.string().describe('The path where the project was extracted'),
      },
    },
    async handler(ctx) {
      const input = ctx.input;
      ctx.logger.info(`Generating Spring Boot project with artifact: ${input.artifactId || 'demo'}`);

      // Get endpoint from input or config, default to start.spring.io
      const endpoint = 
        input.endpoint || 
        config.getOptionalString('springInitializer.endpoint') || 
        'https://start.spring.io';

      // Build the request URL - only add non-empty parameters
      const params = new URLSearchParams();
      
      // Add parameters, filtering out empty/undefined values
      const addParam = (key: string, value: string | undefined, defaultValue?: string) => {
        const finalValue = value || defaultValue;
        if (finalValue && finalValue.trim() !== '') {
          params.append(key, finalValue);
        }
      };
      
      addParam('type', input.type, 'maven-project');
      addParam('language', input.language, 'java');
      addParam('bootVersion', input.bootVersion, '3.5.10');
      addParam('groupId', input.groupId, 'com.example');
      addParam('artifactId', input.artifactId, 'demo');
      addParam('version', input.version, '0.0.1-SNAPSHOT');
      addParam('name', input.name, 'demo');
      addParam('description', input.description, 'Demo project for Spring Boot');
      addParam('packageName', input.packageName, 'com.example.demo');
      addParam('packaging', input.packaging, 'jar');
      addParam('javaVersion', input.javaVersion, '17');
      
      // Add dependencies if provided and not empty
      if (input.dependencies && input.dependencies.trim() !== '') {
        params.append('dependencies', input.dependencies);
      }

      const url = `${endpoint}/starter.zip?${params.toString()}`;
      ctx.logger.info(`Fetching Spring project from: ${url}`);
      ctx.logger.info(`Parameters: ${JSON.stringify(Object.fromEntries(params))}`);

      try {
        // Fetch the zip file
        const response = await fetch(url);
        
        if (!response.ok) {
          // Try to get error details from response body
          let errorMessage = `Failed to fetch Spring project: ${response.status} ${response.statusText}`;
          try {
            const errorBody = await response.text();
            if (errorBody) {
              ctx.logger.error(`Spring Initializer error response: ${errorBody}`);
              errorMessage += `\n\nSpring Initializer error: ${errorBody}`;
            }
          } catch (e) {
            // Ignore errors reading response body
          }
          throw new Error(errorMessage);
        }

        const buffer = await response.buffer();
        
        // Create AdmZip instance from buffer
        const zip = new AdmZip(buffer);
        
        // Determine output path
        const outputPath = resolveSafeChildPath(ctx.workspacePath, input.outputPath || '.');
        
        // Ensure output directory exists
        await fs.ensureDir(outputPath);
        
        // Extract zip contents
        zip.extractAllTo(outputPath, true);
        
        ctx.logger.info(`Spring project extracted to: ${outputPath}`);
        
        // Output the project path
        ctx.output('projectPath', path.relative(ctx.workspacePath, outputPath) || '.');
        
      } catch (error) {
        ctx.logger.error(`Error generating Spring project: ${error}`);
        throw error;
      }
    },
  });
}
