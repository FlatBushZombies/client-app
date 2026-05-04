export async function waitForClerkToken(
  getToken: () => Promise<string | null>,
  attempts = 4,
  delayMs = 250
) {
  for (let index = 0; index < attempts; index += 1) {
    const token = await getToken()
    if (token) {
      return token
    }

    if (index < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * (index + 1)))
    }
  }

  return null
}
