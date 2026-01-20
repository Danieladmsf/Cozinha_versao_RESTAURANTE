import React from 'react';
import WeekNavigator from "@/components/shared/WeekNavigator";
import { getWeek, getYear } from "date-fns";

const MenuHeader = ({
  currentDate,
  onDateChange,
  rightContent = null,
  weekRange = 'workdays' // 'workdays' (Seg-Sex) | 'full' (Dom-Sáb)
}) => {
  return (
    <div className="px-6 py-4">
      <div className="flex justify-center items-center relative">
        {/* Centered Week Navigation */}
        <WeekNavigator
          currentDate={currentDate}
          onDateChange={onDateChange}
          weekNumber={getWeek(currentDate, { weekStartsOn: 1 })}
          weekRange={weekRange}
          showCalendar={true}
        />

        {/* Additional content positioned on the right */}
        {rightContent && (
          <div className="absolute right-0 flex items-center">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuHeader;