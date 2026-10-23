using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace PrintCostD3D
{
    class Program
    {
        private const uint IMAGE_ICON = 1;
        private const uint LR_LOADFROMFILE = 0x00000010;
        private const uint WM_SETICON = 0x0080;
        private const int ICON_SMALL = 0;
        private const int ICON_BIG = 1;

        private delegate bool EnumWindowsProc(IntPtr window, IntPtr parameter);

        [DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr parameter);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetWindowText(IntPtr window, StringBuilder text, int maxCount);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern int GetClassName(IntPtr window, StringBuilder className, int maxCount);

        [DllImport("user32.dll")]
        private static extern bool IsWindowVisible(IntPtr window);

        [DllImport("user32.dll")]
        private static extern bool IsWindow(IntPtr window);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr LoadImage(IntPtr instance, string name, uint type, int width, int height, uint load);

        [DllImport("user32.dll")]
        private static extern IntPtr SendMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll")]
        private static extern bool DestroyIcon(IntPtr icon);

        [STAThread]
        static void Main()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string htmlPath = Path.Combine(baseDir, "index.html");
            string iconPath = Path.Combine(baseDir, "PrintCost3D.ico");
            
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = edgePath;
            psi.Arguments = "--app=\"" + htmlPath + "\" --window-size=1250,850";
            psi.UseShellExecute = false;
            Process.Start(psi);

            if (!File.Exists(iconPath))
            {
                return;
            }

            IntPtr icon = LoadImage(IntPtr.Zero, iconPath, IMAGE_ICON, 0, 0, LR_LOADFROMFILE);
            if (icon == IntPtr.Zero)
            {
                throw new InvalidOperationException("Não foi possível carregar o ícone PrintCost3D.ico.");
            }

            try
            {
                IntPtr appWindow = IntPtr.Zero;
                DateTime deadline = DateTime.UtcNow.AddSeconds(30);
                while (appWindow == IntPtr.Zero && DateTime.UtcNow < deadline)
                {
                    appWindow = FindAppWindow();
                    if (appWindow == IntPtr.Zero)
                    {
                        Thread.Sleep(250);
                    }
                }

                if (appWindow == IntPtr.Zero)
                {
                    throw new InvalidOperationException("Não foi possível localizar a janela do PrintCost D3D para aplicar o ícone.");
                }

                SendMessage(appWindow, WM_SETICON, new IntPtr(ICON_SMALL), icon);
                SendMessage(appWindow, WM_SETICON, new IntPtr(ICON_BIG), icon);

                while (IsWindow(appWindow))
                {
                    Thread.Sleep(500);
                }
            }
            finally
            {
                DestroyIcon(icon);
            }
        }

        private static IntPtr FindAppWindow()
        {
            IntPtr appWindow = IntPtr.Zero;
            EnumWindowsProc callback = delegate(IntPtr window, IntPtr parameter)
            {
                if (!IsWindowVisible(window))
                {
                    return true;
                }

                StringBuilder className = new StringBuilder(128);
                GetClassName(window, className, className.Capacity);
                if (!className.ToString().StartsWith("Chrome_WidgetWin"))
                {
                    return true;
                }

                StringBuilder title = new StringBuilder(512);
                GetWindowText(window, title, title.Capacity);
                if (title.ToString().IndexOf("PrintCost D3D", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    appWindow = window;
                    return false;
                }

                return true;
            };

            EnumWindows(callback, IntPtr.Zero);
            return appWindow;
        }
    }
}
