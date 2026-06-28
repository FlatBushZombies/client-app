export async function waitForClerkToken(
  getToken: () => Promise<string | null>,
  attempts = 6,
  delayMs = 300
) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const token = await getToken()
      if (token) {
        return token
      }
    } catch (error) {
      console.warn("[Auth] Failed to resolve Clerk token", error)
    }

    if (index < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * (index + 1)))
    }
  }

  return null
}
