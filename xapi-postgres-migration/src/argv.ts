import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export interface Argv {
  dry?: boolean
  overwrite?: boolean
}

export const parser = yargs(hideBin(process.argv))
  .option('dry-run', {
    alias: 'dry',
    description: 'Execute a dry-run',
    type: 'boolean',
    default: false,
  })
  .option('overwrite', {
    alias: 'o',
    description: 'Overwrite rows if they already exist',
    type: 'boolean',
    default: false,
  })
  .help()
  .alias('help', 'h')
