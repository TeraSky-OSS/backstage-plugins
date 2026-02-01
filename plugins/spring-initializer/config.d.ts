export interface Config {
  springInitializer?: {
    /**
     * The endpoint URL for Spring Initializer
     * @visibility frontend
     */
    endpoint?: string;
    /**
     * The proxy path for Spring Initializer API calls
     * @visibility frontend
     * @default '/spring-initializer'
     */
    proxyPath?: string;
    
    /**
     * Default group ID value
     * @visibility frontend
     */
    defaultGroupId?: string;
    /**
     * Make group ID field read-only
     * @visibility frontend
     */
    defaultGroupIdReadOnly?: boolean;
    
    /**
     * Default Spring Boot version
     * @visibility frontend
     */
    defaultBootVersion?: string;
    /**
     * Make Spring Boot version field read-only
     * @visibility frontend
     */
    defaultBootVersionReadOnly?: boolean;
    
    /**
     * Default Java version
     * @visibility frontend
     */
    defaultJavaVersion?: string;
    /**
     * Make Java version field read-only
     * @visibility frontend
     */
    defaultJavaVersionReadOnly?: boolean;
    
    /**
     * Default packaging type
     * @visibility frontend
     */
    defaultPackaging?: string;
    /**
     * Make packaging field read-only
     * @visibility frontend
     */
    defaultPackagingReadOnly?: boolean;
    
    /**
     * Default project type
     * @visibility frontend
     */
    defaultType?: string;
    /**
     * Make project type field read-only
     * @visibility frontend
     */
    defaultTypeReadOnly?: boolean;
    
    /**
     * Default language
     * @visibility frontend
     */
    defaultLanguage?: string;
    /**
     * Make language field read-only
     * @visibility frontend
     */
    defaultLanguageReadOnly?: boolean;
    
    /**
     * Required dependencies (cannot be removed by user)
     * @visibility frontend
     * @example ['web', 'actuator']
     */
    requiredDependencies?: string[];
    /**
     * Disallowed dependencies (hidden from users)
     * @visibility frontend
     * @example ['devtools', 'lombok']
     */
    disallowedDependencies?: string[];
  };
}
