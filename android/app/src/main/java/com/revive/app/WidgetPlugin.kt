package com.revive.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import com.getcapacitor.JSArray
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray

@CapacitorPlugin(name = "Widget")
class WidgetPlugin : Plugin() {

    private fun prefs(): SharedPreferences =
        context.getSharedPreferences("revive_widget_prefs", Context.MODE_PRIVATE)

    /** Web から Premium フラグを渡す */
    @PluginMethod
    fun setPremium(call: PluginCall) {
        val value = call.getBoolean("value") ?: false
        prefs().edit().putBoolean("is_premium", value).apply()
        refreshWidgets()
        call.resolve()
    }

    /** Web から現在のタスク一覧を渡す */
    @PluginMethod
    fun setCurrentTasks(call: PluginCall) {
        val tasks: JSArray = call.getArray("tasks") ?: JSArray()
        val arr = JSONArray()
        for (i in 0 until tasks.length()) {
            arr.put(tasks.getString(i))
        }
        prefs().edit().putString("current_tasks", arr.toString()).apply()
        refreshWidgets()
        call.resolve()
    }

    /** ウィジェットを強制リフレッシュ */
    private fun refreshWidgets() {
        val mgr = AppWidgetManager.getInstance(context)
        val ids = mgr.getAppWidgetIds(
            ComponentName(context, "com.revive.app.widget.TodayWidgetReceiver")
        )
        val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            setPackage(context.packageName)
        }
        context.sendBroadcast(intent)
    }
}
