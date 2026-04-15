package com.revive.app.widget

import androidx.glance.appwidget.GlanceAppWidgetReceiver

class TodayWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget = TodayWidget()
}
