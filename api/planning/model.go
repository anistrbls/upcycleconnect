package planning

import "time"

type ServiceSlot struct {
	ID           int64     `json:"id"`
	ServiceID    int64     `json:"serviceId"`
	ServiceName  string    `json:"serviceName,omitempty"`
	EmployeeID   int64     `json:"employeeId"`
	EmployeeName string    `json:"employeeName,omitempty"`
	StartTime    time.Time `json:"startTime"`
	EndTime      time.Time `json:"endTime"`
	Capacity     int       `json:"capacity"`
	IsAvailable  bool      `json:"isAvailable"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CreateSlotPayload struct {
	ServiceID  int64     `json:"serviceId"`
	EmployeeID int64     `json:"employeeId"`
	StartTime  time.Time `json:"startTime"`
	EndTime    time.Time `json:"endTime"`
	Capacity   int       `json:"capacity"`
}

type Unavailability struct {
	ID           int64     `json:"id"`
	EmployeeID   int64     `json:"employeeId"`
	EmployeeName string    `json:"employeeName,omitempty"`
	StartTime    time.Time `json:"startTime"`
	EndTime      time.Time `json:"endTime"`
	Reason       string    `json:"reason"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type CreateUnavailabilityPayload struct {
	EmployeeID int64     `json:"employeeId"`
	StartTime  time.Time `json:"startTime"`
	EndTime    time.Time `json:"endTime"`
	Reason     string    `json:"reason"`
}

type WorkingRules struct {
	EmployeeID          int64     `json:"employeeId"`
	MonActive           bool      `json:"monActive"`
	MonStart            string    `json:"monStart"`
	MonEnd              string    `json:"monEnd"`
	TueActive           bool      `json:"tueActive"`
	TueStart            string    `json:"tueStart"`
	TueEnd              string    `json:"tueEnd"`
	WedActive           bool      `json:"wedActive"`
	WedStart            string    `json:"wedStart"`
	WedEnd              string    `json:"wedEnd"`
	ThuActive           bool      `json:"thuActive"`
	ThuStart            string    `json:"thuStart"`
	ThuEnd              string    `json:"thuEnd"`
	FriActive           bool      `json:"friActive"`
	FriStart            string    `json:"friStart"`
	FriEnd              string    `json:"friEnd"`
	SatActive           bool      `json:"satActive"`
	SatStart            string    `json:"satStart"`
	SatEnd              string    `json:"satEnd"`
	SunActive           bool      `json:"sunActive"`
	SunStart            string    `json:"sunStart"`
	SunEnd              string    `json:"sunEnd"`
	WorksPublicHolidays bool      `json:"worksPublicHolidays"`
	UpdatedAt           time.Time `json:"updatedAt"`
}
