/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    webpack: (config, context) => {
        if (context.dev) {
            config.watchOptions = {
                poll: 1000,
                aggregateTimeout: 300,
            };
        }
        return config;
    },
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: "http://api:8080/api/:path*",
            },
        ];
    },
};

export default nextConfig;
