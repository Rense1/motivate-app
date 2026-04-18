import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // トークンを使ってユーザーを確認
  const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
