/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@warrant/client'],
  webpack: (config) => {
    // @warrant/client is a plain CommonJS package with no bundler-specific
    // exports field; this keeps webpack resolving `require`/`module.exports`
    // inside it without needing any change to the library itself.
    config.resolve.extensionAlias = undefined
    return config
  },
}

export default nextConfig
