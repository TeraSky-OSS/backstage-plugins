/**
 * The Educates backend plugin provides API endpoints for managing Educates workshops.
 *
 * @packageDocumentation
 */

export { educatesPlugin as default } from './plugin';
export { educatesPlugin } from './plugin';
export {
  educatesPortalConditions,
  educatesWorkshopConditions,
  createEducatesPortalConditionalDecision,
  createEducatesWorkshopConditionalDecision,
} from './conditions';
export {
  educatesPortalPermissionResourceRef,
  educatesWorkshopPermissionResourceRef,
  rules,
} from './rules'; 