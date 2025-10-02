import { neon } from "@neondatabase/serverless"

const sql = neon(`${process.env.DATABASE_URL}`)

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`)

    const formData = await request.json()

    const { serviceType, selectedServices, startDate, endDate, maxPrice, specialistChoice, additionalInfo, documents } =
      formData

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

    return new Response(JSON.stringify({ success: true, data: result[0] }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Error inserting service request:", error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
export async function GET(request: Request) {
  try {
    // Get query parameters from URL
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const serviceType = searchParams.get('serviceType')
    const limit = searchParams.get('limit') || '10'
    const offset = searchParams.get('offset') || '0'

    let result

    if (id) {
      // Fetch a specific service request by ID
      result = await sql`
        SELECT * FROM service_request 
        WHERE id = ${id}
      `
      
      if (result.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "Service request not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      return new Response(JSON.stringify({ success: true, data: result[0] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } else {
      // Fetch multiple service requests with optional filtering
      if (serviceType) {
        result = await sql`
          SELECT * FROM service_request 
          WHERE service_type = ${serviceType}
          ORDER BY created_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `
      } else {
        result = await sql`
          SELECT * FROM service_request 
          ORDER BY created_at DESC
          LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data: result,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: result.length
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (error: any) {
    console.error("Error fetching service requests:", error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}