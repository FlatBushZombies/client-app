import { getApiUrl } from "@/lib/fetch"

type ClerkEmail = {
  emailAddress?: string | null
}

type ClerkLikeUser = {
  id?: string | null
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  imageUrl?: string | null
  primaryEmailAddress?: ClerkEmail | null
}

function buildUserPayload(user: ClerkLikeUser) {
  const fullName =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    null

  return {
    clerkId: user.id,
    name: fullName,
    email: user.primaryEmailAddress?.emailAddress || null,
    imageUrl: user.imageUrl || null,
  }
}

async function parseJsonSafely(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function ensureBackendUser(user: ClerkLikeUser | null | undefined) {
  if (!user?.id) {
    return null
  }

  const lookupResponse = await fetch(getApiUrl(`/api/user/get?clerkId=${user.id}`))
  const lookupData = await parseJsonSafely(lookupResponse)

  if (lookupResponse.ok && lookupData?.user) {
    return lookupData.user
  }

  if (lookupResponse.status !== 404) {
    throw new Error(lookupData?.message || lookupData?.error || "Failed to load user")
  }

  const createResponse = await fetch(getApiUrl("/api/user"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildUserPayload(user)),
  })
  const createData = await parseJsonSafely(createResponse)

  if (!createResponse.ok || !createData?.user) {
    throw new Error(createData?.message || createData?.error || "Failed to create user")
  }

  return createData.user
}
