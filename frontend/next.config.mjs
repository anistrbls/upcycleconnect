/** @type {import('next').NextConfig} */
const normalizeUrl = (value = "") => value.trim().replace(/^['\"]|['\"]$/g, "").replace(/\/+$/, "");

const apiInternalUrl = (() => {
    const explicitInternalUrl = normalizeUrl(process.env.API_INTERNAL_URL || "");
    if (explicitInternalUrl) {
        return explicitInternalUrl;
    }

    const publicApiUrl = normalizeUrl(process.env.NEXT_PUBLIC_API_URL || "");
    if (/^https?:\/\//i.test(publicApiUrl)) {
        return publicApiUrl;
    }

    return "http://localhost:8080";
})();

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
                destination: `${apiInternalUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
