import Foundation
import UserNotifications

let center = UNUserNotificationCenter.current()
center.requestAuthorization(options: [.alert, .badge]) { granted, error in
    if granted {
        let content = UNMutableNotificationContent()
        content.title = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "Deployed"
        content.interruptionLevel = .timeSensitive
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        center.add(request) { _ in exit(0) }
    } else {
        exit(1)
    }
}
RunLoop.main.run(until: Date(timeIntervalSinceNow: 5))
