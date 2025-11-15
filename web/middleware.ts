import proxy from './src/proxy'

export const config = {
  matcher: ['/app/:path*', '/admin/:path*', '/desk/:path*', '/account/:path*', '/api/:path*'],
}

export default proxy
