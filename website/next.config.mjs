/** @type {import('next').NextConfig} */
const nextConfig = {};



// export default nextConfig;

export default {
    async rewrites() {
        return [
            {
                source: '/predict',
                destination: 'http://127.0.0.1:5000/predict' // Proxy to Flask server
            }
        ];
    }
};
