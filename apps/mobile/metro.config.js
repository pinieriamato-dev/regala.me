const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch the entire monorepo so shared packages resolve correctly
config.watchFolders = [monorepoRoot]

// Resolve modules from both the app and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Exclude pnpm temp directories that expo-splash-screen creates during postinstall
config.resolver.blockList = [
  /node_modules\/.pnpm\/.*_tmp_\d+.*/,
]

module.exports = config
