#!/usr/bin/gjs -m
import Gtk from 'gi://Gtk?version=4.0'
import Gio from 'gi://Gio?version=2.0'
import GLib from 'gi://GLib?version=2.0'
import Adw from 'gi://Adw?version=1'
import WebKit from 'gi://WebKit2?version=5.0'

const appID = 'com.github.johnfactotum.Runesmith'
GLib.set_prgname(appID)
GLib.set_application_name('Runesmith')

const moduleDir = GLib.path_get_dirname(GLib.filename_from_uri(import.meta.url)[0])
const modulePath = path => GLib.build_filenamev([moduleDir, path])

const application = new Adw.Application({ applicationId: appID })
application.connect('activate', () => {
    const webView = new WebKit.WebView()
    webView.load_uri(Gio.File.new_for_path(modulePath('index.html')).get_uri())
    const win = new Gtk.ApplicationWindow({
        application,
        defaultWidth: 1150,
        defaultHeight: 720,
        child: webView,
    })
    win.present()
})
application.run([])
