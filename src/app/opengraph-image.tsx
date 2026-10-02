export default function OpenGraphImage() {
  return new Response(
    `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
        <rect width="1200" height="630" fill="#080808" />
        <text x="600" y="320" fill="#f5f5f5" text-anchor="middle" font-size="96" font-family="Arial, sans-serif" letter-spacing="10">NØR 75</text>
      </svg>
    `,
    {
      headers: {
        "content-type": "image/svg+xml",
      },
    },
  );
}
