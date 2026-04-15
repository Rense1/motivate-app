package com.revive.app.widget

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import org.json.JSONArray

class TodayWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val prefs = context.getSharedPreferences("revive_widget_prefs", Context.MODE_PRIVATE)
        val isPremium = prefs.getBoolean("is_premium", false)
        val tasksJson = prefs.getString("current_tasks", "[]") ?: "[]"

        val tasks = mutableListOf<String>()
        try {
            val arr = JSONArray(tasksJson)
            for (i in 0 until arr.length()) tasks.add(arr.getString(i))
        } catch (_: Exception) {}

        provideContent {
            WidgetContent(isPremium = isPremium, tasks = tasks)
        }
    }
}

@Composable
private fun WidgetContent(isPremium: Boolean, tasks: List<String>) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(Color(0xFF1F1F1F))
            .padding(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        // ── ヘッダー ──────────────────────────────────────────────────────
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "REVIVE",
                style = TextStyle(
                    color = ColorProvider(Color(0xFFEF4444)),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                ),
            )
            Spacer(modifier = GlanceModifier.defaultWeight())
            if (isPremium) {
                Text(
                    text = "★ Premium",
                    style = TextStyle(
                        color = ColorProvider(Color(0xFFFBBF24)),
                        fontSize = 10.sp,
                    ),
                )
            }
        }

        Spacer(modifier = GlanceModifier.height(8.dp))

        if (!isPremium) {
            // ── 非 Premium 表示 ───────────────────────────────────────────
            Box(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .background(Color(0xFF2D2D2D))
                    .padding(10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "🔒 Premium限定\nウィジェット機能",
                    style = TextStyle(
                        color = ColorProvider(Color(0xFFAAAAAA)),
                        fontSize = 12.sp,
                    ),
                )
            }
        } else if (tasks.isEmpty()) {
            // ── タスクなし ────────────────────────────────────────────────
            Text(
                text = "今日のタスクはありません",
                style = TextStyle(
                    color = ColorProvider(Color(0xFF888888)),
                    fontSize = 12.sp,
                ),
            )
        } else {
            // ── タスク一覧 ────────────────────────────────────────────────
            Text(
                text = "今日のタスク",
                style = TextStyle(
                    color = ColorProvider(Color(0xFFCCCCCC)),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                ),
            )
            Spacer(modifier = GlanceModifier.height(6.dp))

            tasks.take(5).forEach { title ->
                Row(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .padding(vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = GlanceModifier
                            .width(6.dp)
                            .height(6.dp)
                            .background(Color(0xFFEF4444)),
                    ) {}
                    Spacer(modifier = GlanceModifier.width(8.dp))
                    Text(
                        text = title,
                        style = TextStyle(
                            color = ColorProvider(Color(0xFFEEEEEE)),
                            fontSize = 12.sp,
                        ),
                        maxLines = 1,
                    )
                }
            }

            if (tasks.size > 5) {
                Spacer(modifier = GlanceModifier.height(4.dp))
                Text(
                    text = "他 ${tasks.size - 5} 件...",
                    style = TextStyle(
                        color = ColorProvider(Color(0xFF888888)),
                        fontSize = 11.sp,
                    ),
                )
            }
        }
    }
}
