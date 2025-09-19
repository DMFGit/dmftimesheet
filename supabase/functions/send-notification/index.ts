import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

// Environment-based CORS headers for security
const getAllowedOrigins = () => {
  const origins = [
    'https://timesheet.dmfengineering.com', // Production domain
    'https://c3a57c17-3ced-485e-b8c7-1925931e7c9f.lovableproject.com', // Preview domain
  ];
  
  // Allow localhost for development
  if (Deno.env.get('ENVIRONMENT') === 'development') {
    origins.push('http://localhost:5173', 'http://localhost:3000');
  }
  
  return origins;
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
    'Content-Security-Policy': "default-src 'none'", // Security header
    'X-Content-Type-Options': 'nosniff', // Prevent MIME sniffing
    'X-Frame-Options': 'DENY', // Prevent clickjacking
  };
};

interface NotificationRequest {
  type: 'time_entry_approved' | 'time_entry_rejected' | 'timesheet_submitted';
  employeeId: string;
  entryDetails?: {
    date: string;
    hours: number;
    projectName?: string;
    taskDescription?: string;
    wbsCode: string;
  };
  weekDetails?: {
    weekStart: string;
    weekEnd: string;
    totalHours: number;
    entryCount: number;
  };
  reviewNotes?: string;
}

// Input validation functions
const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

const validateNotificationRequest = (data: any): data is NotificationRequest => {
  if (!data || typeof data !== 'object') return false;
  
  // Validate required fields
  if (!data.type || !['time_entry_approved', 'time_entry_rejected', 'timesheet_submitted'].includes(data.type)) {
    return false;
  }
  
  if (!data.employeeId || !validateUUID(data.employeeId)) {
    return false;
  }
  
  // Validate entry details if present
  if (data.entryDetails) {
    if (!data.entryDetails.date || !data.entryDetails.hours || !data.entryDetails.wbsCode) {
      return false;
    }
    if (typeof data.entryDetails.hours !== 'number' || data.entryDetails.hours <= 0) {
      return false;
    }
  }
  
  // Validate week details if present
  if (data.weekDetails) {
    if (!data.weekDetails.weekStart || !data.weekDetails.weekEnd || 
        typeof data.weekDetails.totalHours !== 'number' || 
        typeof data.weekDetails.entryCount !== 'number') {
      return false;
    }
  }
  
  // Sanitize review notes if present
  if (data.reviewNotes && typeof data.reviewNotes === 'string') {
    data.reviewNotes = data.reviewNotes.trim().substring(0, 1000); // Limit length
  }
  
  return true;
};

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    // Parse and validate request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Validate request data
    if (!validateNotificationRequest(requestData)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const { 
      type, 
      employeeId, 
      entryDetails, 
      weekDetails,
      reviewNotes 
    }: NotificationRequest = requestData;

    console.log('Sending notification for:', type, 'to employee:', employeeId);

    // Get employee details
    const { data: employee, error: employeeError } = await supabaseClient
      .from('Employees')
      .select('name, email, user_id')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      console.error('Employee lookup failed:', employeeError);
      return new Response(
        JSON.stringify({ success: false, error: 'Employee not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle timesheet submission notification
    if (type === 'timesheet_submitted') {
      // Get admin email (you can modify this logic as needed)
      const { data: adminEmployee, error: adminError } = await supabaseClient
        .from('Employees')
        .select('name, email')
        .eq('role', 'admin')
        .single();

      if (!adminError && adminEmployee) {
        const emailSubject = `Timesheet Submitted for Review - ${employee.name}`;
        
        const adminEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1f2937; margin: 0; font-size: 24px;">DMF Engineering - Admin Notification</h1>
                <div style="width: 60px; height: 4px; background-color: #3b82f6; margin: 10px auto;"></div>
              </div>

              <div style="background-color: #3b82f615; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h2 style="color: #3b82f6; margin: 0 0 10px 0; font-size: 20px;">
                  📋 New Timesheet Submitted
                </h2>
                <p style="margin: 0; color: #6b7280;">
                  ${employee.name} has submitted their timesheet for review.
                </p>
              </div>

              <div style="margin: 20px 0;">
                <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Submission Details</h3>
                <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 6px; overflow: hidden;">
                  <tr>
                    <td style="padding: 12px 16px; font-weight: bold; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Employee:</td>
                    <td style="padding: 12px 16px; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${employee.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-weight: bold; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Week Period:</td>
                    <td style="padding: 12px 16px; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${weekDetails?.weekStart} to ${weekDetails?.weekEnd}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-weight: bold; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Total Hours:</td>
                    <td style="padding: 12px 16px; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${weekDetails?.totalHours}h</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-weight: bold; color: #6b7280;">Entries Count:</td>
                    <td style="padding: 12px 16px; color: #1f2937;">${weekDetails?.entryCount} entries</td>
                  </tr>
                </table>
              </div>

              <div style="margin-top: 30px; text-align: center;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  Please review the submitted timesheet in the admin dashboard.
                </p>
              </div>
            </div>
          </div>
        `;

        await resend.emails.send({
          from: 'DMF Engineering <timesheet@dmfengineering.com>',
          to: [adminEmployee.email],
          subject: emailSubject,
          html: adminEmailHtml,
        });
      }

      // Create in-app notification for employee confirmation
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: employee.user_id,
          title: 'Timesheet Submitted',
          message: `Your timesheet for week ${weekDetails?.weekStart} to ${weekDetails?.weekEnd} (${weekDetails?.totalHours}h) has been submitted for admin review.`,
          type: 'info',
          related_type: 'timesheet'
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Timesheet submission notification sent successfully' 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const isApproved = type === 'time_entry_approved';
    const status = isApproved ? 'approved' : 'rejected';
    const statusColor = isApproved ? '#10b981' : '#ef4444';

    // Create in-app notification
    const notificationTitle = `Time Entry ${isApproved ? 'Approved' : 'Rejected'}`;
    const notificationMessage = `Your time entry for ${entryDetails.date} (${entryDetails.hours} hours on ${entryDetails.wbsCode}) has been ${status}.${reviewNotes ? ' Review notes: ' + reviewNotes : ''}`;

    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: employee.user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: isApproved ? 'success' : 'warning',
        related_type: 'time_entry'
      });

    if (notificationError) {
      console.error('Failed to create in-app notification:', notificationError);
    }

    // Send email notification
    const emailSubject = `Time Entry ${isApproved ? 'Approved' : 'Rejected'} - ${entryDetails.date}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">DMF Engineering Timesheet</h1>
            <div style="width: 60px; height: 4px; background-color: ${statusColor}; margin: 10px auto;"></div>
          </div>

          <div style="background-color: ${statusColor}15; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: ${statusColor}; margin: 0 0 10px 0; font-size: 20px;">
              ${isApproved ? '✅' : '❌'} Time Entry ${isApproved ? 'Approved' : 'Rejected'}
            </h2>
            <p style="margin: 0; color: #6b7280;">
              Your time entry has been reviewed and ${status}.
            </p>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Entry Details</h3>
            <table style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 6px; overflow: hidden;">
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Date:</td>
                <td style="padding: 12px 16px; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${entryDetails.date}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Hours:</td>
                <td style="padding: 12px 16px; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${entryDetails.hours}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-weight: bold; color: #6b7280; border-bottom: 1px solid #e5e7eb;">WBS Code:</td>
                <td style="padding: 12px 16px; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${entryDetails.wbsCode}</td>
              </tr>
              ${entryDetails.projectName ? `
                <tr>
                  <td style="padding: 12px 16px; font-weight: bold; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Project:</td>
                  <td style="padding: 12px 16px; color: #1f2937; border-bottom: 1px solid #e5e7eb;">${entryDetails.projectName}</td>
                </tr>
              ` : ''}
              ${entryDetails.taskDescription ? `
                <tr>
                  <td style="padding: 12px 16px; font-weight: bold; color: #6b7280;">Task:</td>
                  <td style="padding: 12px 16px; color: #1f2937;">${entryDetails.taskDescription}</td>
                </tr>
              ` : ''}
            </table>
          </div>

          ${reviewNotes ? `
            <div style="margin: 20px 0;">
              <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Review Notes</h3>
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px;">
                <p style="margin: 0; color: #92400e; line-height: 1.5;">${reviewNotes}</p>
              </div>
            </div>
          ` : ''}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This is an automated notification from DMF Engineering's timesheet system.
            </p>
          </div>
        </div>
      </div>
    `;

    const { error: emailError } = await resend.emails.send({
      from: 'DMF Engineering <timesheet@dmfengineering.com>',
      to: [employee.email],
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Failed to send email:', emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send email notification',
          details: emailError 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Notification sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in send-notification function:', error);
    
    // Don't expose internal error details in production
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production';
    const errorMessage = isProduction ? 'Internal server error' : error.message;
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});