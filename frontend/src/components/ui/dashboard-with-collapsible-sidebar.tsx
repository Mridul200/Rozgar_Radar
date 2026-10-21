"use client";

import React, { useState, useEffect } from "react";
import {
  Home,
  DollarSign,
  Monitor,
  ShoppingCart,
  Tag,
  BarChart3,
  Users,
  ChevronDown,
  ChevronsRight,
  Moon,
  Sun,
  TrendingUp,
  Activity,
  Package,
  Bell,
  Settings,
  HelpCircle,
  User,
} from "lucide-react";

export const Example = () => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <div className={`flex min-h-screen w-full ${isDark ? "dark" : ""}`}>
      <div className="flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <Sidebar />
        <ExampleContent isDark={isDark} setIsDark={setIsDark} />
      </div>
    </div>
  );
};

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState("Dashboard");

  return (
    <nav
      className={`sticky top-0 h-screen shrink-0 border-r transition-all duration-300 ease-in-out ${
        open ? "w-64" : "w-16"
      } border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2 shadow-sm flex flex-col justify-between`}
    >
      <div>
        <TitleSection open={open} />

        <div className="space-y-1 mb-8">
          <Option
            Icon={Home}
            title="Dashboard"
            selected={selected}
            setSelected={setSelected}
            open={open}
          />
          <Option
            Icon={DollarSign}
            title="Sales"
            selected={selected}
            setSelected={setSelected}
            open={open}
            notifs={3}
          />
          <Option
            Icon={Monitor}
            title="View Site"
            selected={selected}
            setSelected={setSelected}
            open={open}
          />
          <Option
            Icon={ShoppingCart}
            title="Products"
            selected={selected}
            setSelected={setSelected}
            open={open}
          />
          <Option
            Icon={Tag}
            title="Tags"
            selected={selected}
            setSelected={setSelected}
            open={open}
          />
          <Option
            Icon={BarChart3}
            title="Analytics"
            selected={selected}
            setSelected={setSelected}
            open={open}
          />
          <Option
            Icon={Users}
            title="Members"
            selected={selected}
            setSelected={setSelected}
            open={open}
            notifs={12}
          />
        </div>

        {open && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Account
            </div>
            <Option
              Icon={Settings}
              title="Settings"
              selected={selected}
              setSelected={setSelected}
              open={open}
            />
            <Option
              Icon={HelpCircle}
              title="Help & Support"
              selected={selected}
              setSelected={setSelected}
              open={open}
            />
          </div>
        )}
      </div>

      <ToggleClose open={open} setOpen={setOpen} />
    </nav>
  );
};

interface OptionProps {
  Icon: React.ElementType;
  title: string;
  selected: string;
  setSelected: (title: string) => void;
  open: boolean;
  notifs?: number;
}

const Option = ({ Icon, title, selected, setSelected, open, notifs }: OptionProps) => {
  const isSelected = selected === title;

  return (
    <button
      type="button"
      onClick={() => setSelected(title)}
      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
        isSelected
          ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shadow-sm border-l-2 border-blue-500"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
      }`}
    >
      <div className="grid h-full w-12 place-content-center">
        <Icon className="h-4 w-4" />
      </div>

      {open && (
        <span
          className={`text-sm font-medium transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        >
          {title}
        </span>
      )}

      {notifs && open && (
        <span className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 dark:bg-blue-600 text-xs text-white font-medium">
          {notifs}
        </span>
      )}
    </button>
  );
};

const TitleSection = ({ open }: { open: boolean }) => {
  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
        <div className="flex items-center gap-3">
          <Logo />
          {open && (
            <div className={`transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}>
              <div className="flex items-center gap-2">
                <div>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Rozgar Radar
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Pro Plan
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {open && (
          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
      </div>
    </div>
  );
};

const Logo = () => {
  return (
    <img
      src="/logo.jpg"
      alt="Rozgar Radar"
      className="size-10 shrink-0 rounded-lg object-contain bg-white border border-gray-200 dark:border-gray-800 p-0.5 shadow-sm"
    />
  );
};

const ToggleClose = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => {
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className="w-full border-t border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <div className="flex items-center p-3">
        <div className="grid size-10 place-content-center">
          <ChevronsRight
            className={`h-4 w-4 transition-transform duration-300 text-gray-500 dark:text-gray-400 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
        {open && (
          <span
            className={`text-sm font-medium text-gray-600 dark:text-gray-300 transition-opacity duration-200 ${
              open ? "opacity-100" : "opacity-0"
            }`}
          >
            Hide
          </span>
        )}
      </div>
    </button>
  );
};

interface ExampleContentProps {
  isDark: boolean;
  setIsDark: React.Dispatch<React.SetStateAction<boolean>>;
}

const ExampleContent = ({ isDark, setIsDark }: ExampleContentProps) => {
  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-950 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back to your dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
          </button>
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <h3 className="font-medium text-gray-600 dark:text-gray-400 mb-1">Total Verified Jobs</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">2,083</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">+12% direct ATS feeds</p>
        </div>

        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <h3 className="font-medium text-gray-600 dark:text-gray-400 mb-1">Active Job Matches</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">224</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">&gt;60% threshold met</p>
        </div>

        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <h3 className="font-medium text-gray-600 dark:text-gray-400 mb-1">Tracked Applications</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">18</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">3 active interviews</p>
        </div>

        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <h3 className="font-medium text-gray-600 dark:text-gray-400 mb-1">ATS Optimization</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">89%</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">High recruiter pass rate</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Career Activity</h3>
              <button
                type="button"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                View all
              </button>
            </div>
            <div className="space-y-4">
              {[
                { icon: DollarSign, title: "New job alert dispatched", desc: "10 matching tech openings sent to your email", time: "2 min ago", color: "green" },
                { icon: Users, title: "Recruiter viewed profile", desc: "Direct ATS inquiry received", time: "15 min ago", color: "blue" },
                { icon: Package, title: "Resume ATS Scored", desc: "Software Engineer resume scored 93/100", time: "1 hour ago", color: "purple" },
                { icon: Activity, title: "12-Hour ATS Sync", desc: "Greenhouse & Lever feeds synchronized", time: "3 hours ago", color: "orange" },
                { icon: Bell, title: "Application status updated", desc: "Mercari India moved to Interviewing", time: "5 hours ago", color: "red" },
              ].map((activity, i) => (
                <div key={i} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className={`p-2 rounded-lg ${
                    activity.color === "green" ? "bg-green-50 dark:bg-green-900/20" :
                    activity.color === "blue" ? "bg-blue-50 dark:bg-blue-900/20" :
                    activity.color === "purple" ? "bg-purple-50 dark:bg-purple-900/20" :
                    activity.color === "orange" ? "bg-orange-50 dark:bg-orange-900/20" :
                    "bg-red-50 dark:bg-red-900/20"
                  }`}>
                    <activity.icon className={`h-4 w-4 ${
                      activity.color === "green" ? "text-green-600 dark:text-green-400" :
                      activity.color === "blue" ? "text-blue-600 dark:text-blue-400" :
                      activity.color === "purple" ? "text-purple-600 dark:text-purple-400" :
                      activity.color === "orange" ? "text-orange-600 dark:text-orange-400" :
                      "text-red-600 dark:text-red-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {activity.desc}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Pipeline Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Response Rate</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">18.4%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: "65%" }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">ATS Pass Rate</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">92%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: "92%" }}></div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Interview Conversion</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">33%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: "33%" }}></div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Matched Companies</h3>
            <div className="space-y-3">
              {["Mercari India", "Razorpay", "BrowserStack", "Postman"].map((company, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{company}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                    95% Match
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Example;
