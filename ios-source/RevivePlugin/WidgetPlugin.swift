import Foundation
import Capacitor
import WidgetKit

// MARK: - WidgetPlugin
// Androidの WidgetPlugin.kt に相当するiOS版 Capacitorプラグイン。
// JSから setPremium / setCurrentTasks を受け取り、
// App Group の UserDefaults に保存してウィジェットを更新する。
//
// 追加手順（Xcodeで）:
//   1. ios/App/App/ フォルダにこのファイルをコピー
//   2. ios/App/App/AppDelegate.swift で registerPlugin(WidgetPlugin.self) を追加
//   3. Signing & Capabilities で App Groups (group.com.revive.app) を有効化

private let appGroupID = "group.com.revive.app"

@objc(WidgetPlugin)
public class WidgetPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "WidgetPlugin"
    public let jsName     = "Widget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setPremium",      returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setCurrentTasks", returnType: CAPPluginReturnPromise),
    ]

    @objc func setPremium(_ call: CAPPluginCall) {
        let isPremium = call.getBool("isPremium") ?? false
        UserDefaults(suiteName: appGroupID)?.set(isPremium, forKey: "is_premium")
        reloadWidget()
        call.resolve()
    }

    @objc func setCurrentTasks(_ call: CAPPluginCall) {
        guard let titles = call.getArray("taskTitles") as? [String] else {
            call.reject("taskTitles must be a string array")
            return
        }
        if let data = try? JSONSerialization.data(withJSONObject: titles),
           let json = String(data: data, encoding: .utf8) {
            UserDefaults(suiteName: appGroupID)?.set(json, forKey: "current_tasks")
        }
        reloadWidget()
        call.resolve()
    }

    private func reloadWidget() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
