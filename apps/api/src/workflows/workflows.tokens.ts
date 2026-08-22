// A dependency-free token file. AssistantService needs to look up
// WorkflowsService at runtime (via ModuleRef) without importing the actual
// WorkflowsService class — importing the class directly would pull in its
// whole import chain (workflows.service -> notifications.service ->
// telegram.service -> assistant.service), closing a circular JS module
// import back on assistant.service.ts itself and crashing Nest's DI
// resolution at boot ("Nest encountered an undefined dependency"). Importing
// only this token (which imports nothing) breaks that cycle.
export const WORKFLOWS_SERVICE = Symbol('WorkflowsService');
