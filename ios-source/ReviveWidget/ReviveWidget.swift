import WidgetKit
import SwiftUI

// App Group ID（Xcode の Signing & Capabilities で追加すること）
private let appGroupID = "group.com.revive.app"

// MARK: - データモデル

struct WidgetEntry: TimelineEntry {
    let date: Date
    let isPremium: Bool
    let tasks: [String]
}

// MARK: - TimelineProvider

struct ReviveProvider: TimelineProvider {

    func placeholder(in context: Context) -> WidgetEntry {
        WidgetEntry(date: Date(), isPremium: true, tasks: ["タスクA", "タスクB", "タスクC"])
    }

    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> Void) {
        completion(makeEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        let entry = makeEntry()
        // 30分ごとに更新
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func makeEntry() -> WidgetEntry {
        let defaults = UserDefaults(suiteName: appGroupID)
        let isPremium = defaults?.bool(forKey: "is_premium") ?? false
        let tasksJSON = defaults?.string(forKey: "current_tasks") ?? "[]"

        var tasks: [String] = []
        if let data = tasksJSON.data(using: .utf8),
           let arr = try? JSONSerialization.jsonObject(with: data) as? [String] {
            tasks = arr
        }
        return WidgetEntry(date: Date(), isPremium: isPremium, tasks: tasks)
    }
}

// MARK: - ウィジェットビュー

struct ReviveWidgetEntryView: View {
    var entry: WidgetEntry

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 18)
                .fill(Color.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .stroke(Color(red: 0.94, green: 0.27, blue: 0.27), lineWidth: 2.5)
                )

            if !entry.isPremium {
                PremiumLockedView()
            } else if entry.tasks.isEmpty {
                EmptyTasksView()
            } else {
                TaskListView(tasks: entry.tasks)
            }
        }
        .padding(4)
    }
}

struct TaskListView: View {
    let tasks: [String]

    var displayTasks: [String] { Array(tasks.prefix(5)) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // ヘッダー
            HStack {
                Text("今日のタスク")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.black)
                Spacer()
                // カウントバッジ
                Text("0/\(tasks.count)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color(red: 0.94, green: 0.27, blue: 0.27))
                    .clipShape(Capsule())
            }
            .padding(.bottom, 8)

            // タスク一覧
            ForEach(displayTasks, id: \.self) { title in
                HStack(spacing: 8) {
                    Circle()
                        .stroke(Color.gray.opacity(0.4), lineWidth: 1.5)
                        .frame(width: 16, height: 16)
                    Text(title)
                        .font(.system(size: 12))
                        .foregroundColor(.black)
                        .lineLimit(1)
                }
                .padding(.vertical, 3)
            }

            if tasks.count > 5 {
                Text("他 \(tasks.count - 5) 件...")
                    .font(.system(size: 11))
                    .foregroundColor(.gray)
                    .padding(.top, 4)
            }

            Spacer(minLength: 0)
        }
        .padding(14)
    }
}

struct EmptyTasksView: View {
    var body: some View {
        VStack(spacing: 6) {
            Text("今日のタスク")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.black)
            Text("タスクはありません")
                .font(.system(size: 12))
                .foregroundColor(.gray)
        }
        .padding(14)
    }
}

struct PremiumLockedView: View {
    var body: some View {
        VStack(spacing: 6) {
            Text("🔒")
                .font(.system(size: 22))
            Text("Premium限定")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Color(red: 0.94, green: 0.27, blue: 0.27))
            Text("ウィジェット機能")
                .font(.system(size: 11))
                .foregroundColor(.gray)
        }
    }
}

// MARK: - ウィジェット登録

@main
struct ReviveWidget: Widget {
    let kind: String = "ReviveWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ReviveProvider()) { entry in
            ReviveWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("REVIVE Today")
        .description("今日のタスクをホーム画面で確認")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
