/**
 * Package entry: the published type surface, configuration schema, hosted Service, and DSH Bundle.
 *
 * The implementations live in the domain folders (`charter/`, `tuning/`, `optics/`, `custody/`,
 * `binding/`, `motion/`, `conductor/`, `toolbelt/`, `playbook/`, `panel/`); this module is the one
 * place that publishes them to the package root (`lib/index.js`).
 */

export { Config } from './tuning/tuning.schema.ts'
export * from './charter/charter.index.ts'
export * from './conductor/conductor.service.ts'
export { installComputerUseConsumer, ComputerUseBundle } from './conductor/conductor.bundle.ts'
export { default } from './conductor/conductor.bundle.ts'
