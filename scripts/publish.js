#!/usr/bin/env node
import { execFile, spawn } from 'node:child_process'
import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packDir = resolve(packageRoot, '.release')

const args = process.argv.slice(2)
const flags = new Map()

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--') {
    continue
  }

  if (!arg.startsWith('--')) {
    throw new Error(`Unexpected argument: ${arg}`)
  }

  const [key, inlineValue] = arg.slice(2).split('=', 2)
  const next = args[i + 1]

  if (inlineValue !== undefined) {
    flags.set(key, inlineValue)
  } else if (next && !next.startsWith('--')) {
    flags.set(key, next)
    i++
  } else {
    flags.set(key, true)
  }
}

if (flags.has('help')) {
  printHelp()
  process.exit(0)
}

const dryRun = flags.has('dry-run')
const tag = String(flags.get('tag') ?? 'latest')
const access = String(flags.get('access') ?? 'public')
const otp = flags.get('otp')
const provenance = flags.has('provenance')

const pkg = JSON.parse(
  await readFile(resolve(packageRoot, 'package.json'), 'utf8'),
)
const packageSpec = `${pkg.name}@${pkg.version}`

function log(message) {
  console.log(`\n[publish] ${message}`)
}

async function run(command, commandArgs, options = {}) {
  console.log(`$ ${[command, ...commandArgs].join(' ')}`)
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: packageRoot,
      stdio: 'inherit',
      ...options,
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise()
      } else {
        reject(new Error(`${command} exited with code ${code}`))
      }
    })
  })
}

async function runQuiet(command, commandArgs) {
  await execFileAsync(command, commandArgs, {
    cwd: packageRoot,
  })
}

async function versionExists() {
  try {
    await runQuiet('npm', ['view', packageSpec, 'version'])
    return true
  } catch {
    return false
  }
}

async function findPackedTarball() {
  const files = await readdir(packDir)
  const tarballs = files.filter((file) => file.endsWith('.tgz')).toSorted()

  if (tarballs.length !== 1) {
    throw new Error(
      `Expected exactly one packed tarball in ${packDir}, found ${tarballs.length}`,
    )
  }

  return resolve(packDir, tarballs[0])
}

log(`preparing ${packageSpec}`)

const publishedVersionExists = dryRun ? await versionExists() : false

if (!dryRun) {
  log('checking npm login')
  await run('npm', ['whoami'])

  log('checking whether this version already exists')
  const versionAlreadyExists = await versionExists()
  if (versionAlreadyExists) {
    throw new Error(
      `${packageSpec} already exists on npm. Bump the package version first.`,
    )
  }
}

log('building package')
await run('pnpm', ['build'])

log('packing tarball')
await rm(packDir, { force: true, recursive: true })
await mkdir(packDir, { recursive: true })
await run('npm', ['pack', '--ignore-scripts', '--pack-destination', packDir])

const tarball = await findPackedTarball()
const publishArgs = [
  'publish',
  tarball,
  '--access',
  access,
  '--tag',
  tag,
]

if (dryRun) {
  publishArgs.push('--dry-run')
}

if (otp) {
  publishArgs.push('--otp', String(otp))
}

if (provenance) {
  publishArgs.push('--provenance')
}

if (dryRun && publishedVersionExists) {
  log(`${packageSpec} already exists on npm; skipping npm publish --dry-run`)
} else {
  log(dryRun ? 'dry-running npm publish' : 'publishing to npm')
  await run('npm', publishArgs)
}

log(`${dryRun ? 'dry run complete' : 'published'}: ${packageSpec}`)

function printHelp() {
  console.log(`Publish ${pkg.name} to npm.

Usage:
  pnpm release
  pnpm release -- --dry-run
  pnpm release -- --tag next
  pnpm release -- --otp 123456

Options:
  --dry-run       Build, pack, and run npm publish without publishing.
  --tag <tag>     npm dist-tag to publish with. Defaults to latest.
  --access <type> npm access level. Defaults to public.
  --otp <code>    One-time password for npm 2FA.
  --provenance    Publish with npm provenance.
`)
}
