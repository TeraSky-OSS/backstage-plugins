/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  createFrontendModule,
  ApiBlueprint,
} from '@backstage/frontend-plugin-api';
import { ApiEntity } from '@backstage/catalog-model';
import { crdApiWidget } from './widgets';

// Import types and functions from the api-docs plugin
// We need to do a type-only import for the config ref from our local types
// and a runtime import for the default widgets from the actual plugin
import { apiDocsConfigRef } from './types';

// Dynamically import default widgets to avoid issues if api-docs isn't available
let defaultDefinitionWidgets: () => any[];
try {
  const apiDocsModule = require('@backstage/plugin-api-docs');
  defaultDefinitionWidgets = apiDocsModule.defaultDefinitionWidgets || (() => []);
} catch {
  defaultDefinitionWidgets = () => [];
}

/**
 * Frontend module that extends the api-docs plugin with CRD widget support
 * 
 * This module overrides the api-docs config API to include the CRD widget
 * in the list of available definition widgets.
 * 
 * @public
 */
export default createFrontendModule({
  pluginId: 'api-docs',
  extensions: [
    ApiBlueprint.makeWithOverrides({
      name: 'config',
      factory(originalFactory) {
        return originalFactory(defineParams =>
          defineParams({
            api: apiDocsConfigRef,
            deps: {},
            factory: () => {
              // Get all default widgets from the parent plugin and add the CRD widget
              const allWidgets = [...defaultDefinitionWidgets(), crdApiWidget];
              
              return {
                getApiDefinitionWidget: (apiEntity: ApiEntity) => {
                  return allWidgets.find(widget => widget.type === apiEntity.spec.type);
                },
              };
            },
          }),
        );
      },
    }),
  ],
});
