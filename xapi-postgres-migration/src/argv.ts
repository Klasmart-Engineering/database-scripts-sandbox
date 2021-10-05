import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export const parser = yargs(hideBin(process.argv))
  .option('dry-run', {
    alias: 'dry',
    description: 'Execute a dry-run',
    type: 'boolean',
    default: false,
  })
  .help()
  .alias('help', 'h')
