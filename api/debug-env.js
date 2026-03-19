export default function handler(req, res) {
  res.status(200).json({
    hasAppId: !!process.env.GITHUB_APP_ID,
    hasInstallId: !!process.env.GITHUB_INSTALL_ID,
    hasPem: !!process.env.GITHUB_APP_PEM,
    hasPemB64: !!process.env.GITHUB_APP_PEM_B64,
    pemLen: process.env.GITHUB_APP_PEM?.length,
    pemB64Len: process.env.GITHUB_APP_PEM_B64?.length,
  });
}
