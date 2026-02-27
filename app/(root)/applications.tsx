"use client"

import { useUser } from "@clerk/clerk-expo"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useSocket } from "@/contexts/SocketContext"

interface Application {
  id: number
  jobId: number
  freelancerClerkId: string
  freelancerName: string
  freelancerEmail: string
  quotation?: string
  conditions?: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
}

interface Job {
  id: number
  serviceType: string
  maxPrice: number
  applications: Application[]
}

const ApplicationsScreen = () => {
  const { user } = useUser()
  const { unreadCount } = useSocket()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchApplications = async () => {
    try {
      console.log('[Applications] Fetching for user:', user?.id)
      setError(null)
      
      if (!user?.id) {
        console.error('[Applications] No user ID')
        setLoading(false)
        setRefreshing(false)
        return
      }

      // Check if getIdToken method exists
      if (typeof user.getIdToken !== 'function') {
        console.error('[Applications] user.getIdToken is not a function')
        throw new Error('Authentication not ready. Please refresh the page.')
      }

      const token = await user.getIdToken()
      console.log('[Applications] Got token:', token ? 'yes' : 'no')
      
      const response = await fetch(
        'https://quickhands-api.vercel.app/api/applications/client',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      console.log('[Applications] Response status:', response.status)
      
      const data = await response.json()
      console.log('[Applications] Full Response:', JSON.stringify(data, null, 2))
      console.log('[Applications] Response details:', {
        success: data.success,
        dataExists: !!data.data,
        isArray: Array.isArray(data.data),
        count: data.data?.length || 0,
        jobs: data.data?.map((j: any) => ({
          id: j.id,
          serviceType: j.serviceType,
          applicationsCount: j.applications?.length || 0
        })) || []
      })

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch applications')
      }

      const jobsData = data.data || []
      setJobs(jobsData)
      console.log('[Applications] Set jobs:', jobsData.length, 'jobs')
      
      if (jobsData.length > 0) {
        console.log('[Applications] First job sample:', JSON.stringify(jobsData[0], null, 2))
      }
    } catch (error) {
      console.error('[Applications] Error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load applications')
      setJobs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    // Wait for user object to be fully loaded with getIdToken method
    if (user?.id && typeof user.getIdToken === 'function') {
      fetchApplications()
      
      // Poll for new applications every 10 seconds
      const pollInterval = setInterval(() => {
        fetchApplications()
      }, 10000) // 10 seconds
      
      return () => clearInterval(pollInterval)
    }
  }, [user?.id, user?.getIdToken])

  const onRefresh = () => {
    setRefreshing(true)
    fetchApplications()
  }

  const updateApplicationStatus = async (applicationId: number, status: "accepted" | "rejected") => {
    setUpdatingStatus(applicationId)
    try {
      if (!user || typeof user.getIdToken !== 'function') {
        console.error('[Applications] Cannot update status - user not ready')
        return
      }
      const token = await user.getIdToken()
      const response = await fetch(
        `https://quickhands-api.vercel.app/api/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      )

      const data = await response.json()

      if (data.success) {
        // Update local state
        setJobs((prevJobs) =>
          prevJobs.map((job) => ({
            ...job,
            applications: job.applications.map((app) =>
              app.id === applicationId ? { ...app, status } : app
            ),
          }))
        )
      }
    } catch (error) {
      console.error("Error updating application status:", error)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const formatDate = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays === 1) return "yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    
    // For older dates, show the actual date
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "#10B981"
      case "rejected":
        return "#EF4444"
      default:
        return "#F59E0B"
    }
  }

  const renderApplication = (application: Application, job: Job) => (
    <View
      key={application.id}
      style={{
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      {/* Freelancer Info Header */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 16 }}>
        {/* Avatar */}
        <View style={{ 
          width: 56, 
          height: 56, 
          borderRadius: 28, 
          backgroundColor: "#4F46E5",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12
        }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#FFF" }}>
            {application.freelancerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 }}>
            {application.freelancerName}
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 4 }}>
            {application.freelancerEmail || "No email provided"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={{ fontSize: 13, color: "#9CA3AF", marginLeft: 4 }}>
              Applied {formatDate(application.createdAt)}
            </Text>
          </View>
        </View>
        
        {/* Status Badge */}
        <View
          style={{
            backgroundColor: getStatusColor(application.status) + "20",
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 12,
            alignSelf: "flex-start",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: getStatusColor(application.status),
              textTransform: "capitalize",
            }}
          >
            {application.status}
          </Text>
        </View>
      </View>

      {/* Quotation & Conditions */}
      <View style={{ marginBottom: 16 }}>
        {application.quotation && (
          <View style={{ 
            backgroundColor: "#F0FDF4", 
            padding: 14, 
            borderRadius: 14,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#BBF7D0"
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: 20, marginRight: 6 }}>💰</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#166534" }}>Quotation</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#15803D" }}>
              ${application.quotation}
            </Text>
          </View>
        )}
        {application.conditions && (
          <View style={{ 
            backgroundColor: "#EFF6FF", 
            padding: 14, 
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#BFDBFE"
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <Text style={{ fontSize: 20, marginRight: 6 }}>📋</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E40AF" }}>Terms & Conditions</Text>
            </View>
            <Text style={{ fontSize: 14, color: "#1E3A8A", lineHeight: 20 }}>
              {application.conditions}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {application.status === "pending" && (
        <View style={{ 
          flexDirection: "row", 
          gap: 12, 
          paddingTop: 16, 
          borderTopWidth: 1, 
          borderTopColor: "#F3F4F6" 
        }}>
          <TouchableOpacity
            onPress={() => updateApplicationStatus(application.id, "accepted")}
            disabled={updatingStatus === application.id}
            activeOpacity={0.8}
            style={{
              flex: 1,
              backgroundColor: "#10B981",
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
              shadowColor: "#10B981",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {updatingStatus === application.id ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>Accept</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => updateApplicationStatus(application.id, "rejected")}
            disabled={updatingStatus === application.id}
            activeOpacity={0.8}
            style={{
              flex: 1,
              backgroundColor: "#EF4444",
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
              shadowColor: "#EF4444",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {updatingStatus === application.id ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="close-circle" size={20} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700" }}>Reject</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  )

  const renderJob = ({ item: job }: { item: Job }) => (
    <View style={{ marginBottom: 32 }}>
      {/* Job Header */}
      <View
        style={{
          backgroundColor: "#6366F1",
          padding: 20,
          borderRadius: 20,
          marginBottom: 16,
          shadowColor: "#6366F1",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Ionicons name="briefcase" size={24} color="#FFF" style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFF", flex: 1 }}>
            {job.serviceType}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#FFF", marginRight: 4 }}>
              ${job.maxPrice}/h
            </Text>
          </View>
          <View style={{ 
            backgroundColor: "rgba(255,255,255,0.3)", 
            paddingHorizontal: 12, 
            paddingVertical: 6, 
            borderRadius: 12 
          }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFF" }}>
              {job.applications.length} {job.applications.length === 1 ? "Application" : "Applications"}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Applications List */}
      {job.applications.map((app) => renderApplication(app, job))}
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 16, color: "#6B7280" }}>Loading applications...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: "#FFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Applications</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Notifications Summary */}
      {unreadCount > 0 && (
        <View
          style={{
            backgroundColor: "#DBEAFE",
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginHorizontal: 16,
            marginTop: 16,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons name="notifications" size={20} color="#2563EB" />
          <Text style={{ marginLeft: 8, fontSize: 14, color: "#1E40AF", flex: 1 }}>
            You have {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {error && (
        <View
          style={{
            backgroundColor: "#FEE2E2",
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginHorizontal: 16,
            marginTop: 16,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons name="alert-circle" size={20} color="#DC2626" />
          <Text style={{ marginLeft: 8, fontSize: 14, color: "#991B1B", flex: 1 }}>
            {error}
          </Text>
          <TouchableOpacity onPress={fetchApplications}>
            <Text style={{ color: "#DC2626", fontWeight: "600" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Applications List */}
      {jobs.length === 0 && !error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <View style={{
            backgroundColor: "#F3F4F6",
            width: 120,
            height: 120,
            borderRadius: 60,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}>
            <Ionicons name="briefcase-outline" size={64} color="#9CA3AF" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
            No applications yet
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#6B7280",
              textAlign: "center",
              lineHeight: 22,
              paddingHorizontal: 20,
              marginBottom: 16,
            }}
          >
            When freelancers apply to your jobs,{"\n"}you'll see them here within 10 seconds
          </Text>
          {__DEV__ && (
            <View style={{ backgroundColor: "#FEF3C7", padding: 12, borderRadius: 8, marginTop: 16, width: "100%" }}>
              <Text style={{ fontSize: 12, color: "#92400E", fontWeight: "600", marginBottom: 4 }}>Debug Info:</Text>
              <Text style={{ fontSize: 11, color: "#78350F" }}>User ID: {user?.id}</Text>
              <Text style={{ fontSize: 11, color: "#78350F" }}>Loading: {loading.toString()}</Text>
              <Text style={{ fontSize: 11, color: "#78350F" }}>Jobs Count: {jobs.length}</Text>
              <Text style={{ fontSize: 11, color: "#78350F" }}>Has Error: {(!!error).toString()}</Text>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={["#2563EB"]}
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

export default ApplicationsScreen
