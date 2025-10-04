import { neon } from "@neondatabase/serverless"

// Initialize Neon client on the server
const sql = neon(process.env.DATABASE_URL!)

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

// Handle OPTIONS preflight requests
export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders })
}

// POST route: insert new service request
export async function POST(request: Request) {
  console.log("🔎 API HIT /api/service_request [POST]")
  console.log("DATABASE_URL present?", Boolean(process.env.DATABASE_URL))

  try {
    const formData = await request.json()
    const {
      serviceType,
      selectedServices,
      startDate,
      endDate,
      maxPrice,
      specialistChoice,
      additionalInfo,
      documents,
    } = formData

    const result = await sql`
      INSERT INTO service_request (
        service_type,
        selected_services,
        start_date,
        end_date,
        max_price,
        specialist_choice,
        additional_info,
        documents
      )
      VALUES (
        ${serviceType},
        ${JSON.stringify(selectedServices)},
        ${startDate},
        ${endDate},
        ${maxPrice},
        ${specialistChoice},
        ${additionalInfo},
        ${documents}
      )
      RETURNING *;
    `

    return new Response(
      JSON.stringify({ success: true, data: result[0] }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error: any) {
    console.error("Error inserting service request:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
}

// GET route: fetch service requests
export async function GET(request: Request) {
  console.log("🔎 API HIT /api/service_request [GET]")
  console.log("DATABASE_URL present?", Boolean(process.env.DATABASE_URL))

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const serviceType = searchParams.get("serviceType")
    const limit = searchParams.get("limit") || "10"
    const offset = searchParams.get("offset") || "0"

    let result

    if (id) {
      result = await sql`
        SELECT * FROM service_request 
        WHERE id = ${id}
      `
      if (result.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Service request not found" }),
          { status: 404, headers: corsHeaders }
        )
      }
      return new Response(JSON.stringify({ success: true, data: result[0] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    } else {
      if (serviceType) {
        result = await sql`
          SELECT * FROM service_request 
          WHERE service_type = ${serviceType}
          ORDER BY created_at DESC
          LIMIT ${Number.parseInt(limit)} OFFSET ${Number.parseInt(offset)}
        `
      } else {
        result = await sql`
          SELECT * FROM service_request 
          ORDER BY created_at DESC
          LIMIT ${Number.parseInt(limit)} OFFSET ${Number.parseInt(offset)}
        `
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          pagination: {
            limit: Number.parseInt(limit),
            offset: Number.parseInt(offset),
            total: result.length,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
  } catch (error: any) {
    console.error("Error fetching service requests:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
}
