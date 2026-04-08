import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-exam-room-allotment-report',
  templateUrl: './exam-room-allotment-report.component.html',
  styleUrls: ['./exam-room-allotment-report.component.scss']
})
export class ExamRoomAllotmentReportComponent implements OnInit {
  private getCollegeExamDetails=CONSTANTS.getCollegeExamDetails
  filtersDetailsList: any;
  courseCodeList=[];
  evaluatorForm:FormGroup
  academicYear: any[];
  academicYearDuplicateList=[];
  monthYear: any[];
  monthYear1: any[];
  monthYearDuplicateList: any[];
  monthYearData=[];
  examList: any[];
  ExamDuplicateList: any[];
  ExamListData: any[];
  step=0
  // examDate = this.genericFunctions.momentWithDateFormatYMD(this.genericFunctions.moment()) ;
  minDate;
  maxDate;
  examTimetableId: any;
  examDateList: any[];
  ExamDateDuplicateList: any[];
  ExamDateListData: any[];
  summaryDetailsList=[];
  DetailsList=[];
  displayedColumns: string[] = ['id', 'room_name', 'room_strength','available_seats','booked_seats','blocked_seats'];
  studentsummary: string[] = ['id', 'course_year_code', 'group_code','no_of_students','no_of_seat_allotted','no_of_unassigned_students'];
  displayedColumns1: string[] = ['id', 'hallticket_number','student_name','subject_name','room_name','row_no','column_no'];
  studentDetailsdisplayedColumns1: string[] = ['id','hallticket_number','student_name','subject_name','room_name','row_no','column_no'];

  dataSource: MatTableDataSource<any>;
  dataSource1: MatTableDataSource<any>;
  studentsummaryDetails:MatTableDataSource<any>;
  @ViewChild('paginator') paginator: MatPaginator;
  @ViewChild('paginator1') paginator1: MatPaginator;
  @ViewChild('studentSummarypaginator') studentSummarypaginator: MatPaginator;
  @ViewChild('studentSummarypaginator') studentDetailspaginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatSort) sort1: MatSort;
  @ViewChild(MatSort) studentSummarysort: MatSort;
  @ViewChild(MatSort) studentDetailssort: MatSort;
  flag: boolean;
  exam_name: any;
  roomsummaryDetailsList=[];
  examSessionsList=[];
  examSessions=[];
  studentsummaryDetailsList: any[];
  studentDetailsList: any[];
  studentDetails: MatTableDataSource<any>;
  BookedList=[];
  StudentList =[];
 
  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
    private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
    private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,) {        
}

  ngOnInit(): void {
    this.evaluatorForm = this.formBuilder.group({
      CourseCode:['',Validators.required],
      AcademicYear:['',Validators.required],
      ExamMonthYear:['',Validators.required],
      CourseYear:['',],
      examId:['',Validators.required],
      ExamDate:['',Validators.required],
      examSessionId:['',Validators.required]
    })
    this.getFiltersList();
  }
  getFiltersList(): void {
    let request = [
      {paramName: 'in_flag', paramValue: 'exam_timetable_details'},
      {paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId')},
      {paramName: 'in_college_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: 0},
      {paramName: 'in_isadmin', paramValue: ''},
      {paramName: 'in_exam_id', paramValue: 0},
      {paramName: 'in_timetable_id', paramValue: 0},
      {paramName: 'in_exam_date', paramValue: '1990-01-01'},
      { paramName: 'in_subject_id', paramValue: 0 },
      {paramName: 'in_loginuser_empid', paramValue: 0},
      {paramName: 'in_loginuser_roleid', paramValue: 0}
		 
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamDetails, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.filtersDetailsList = result.data.result[0];
              this.courseCodeList=[]
                  /*..............GET COMMITTE DETAILS LIST......... */
                   const courseCode = this.filtersDetailsList.map(({ course_code }) => course_code);
              this.courseCodeList = this.filtersDetailsList.filter(({ course_code }, index) =>
                !courseCode.includes(course_code, index + 1));

                this.evaluatorForm.get('CourseCode').setValue(this.courseCodeList[0]?.course_code)
                this.selectedCourse(this.evaluatorForm.value.CourseCode)
              //   this.committesDuplicateList = this.filtersDetailsList.filter(({ pk_univ_committee_id }, index) =>
              //   !committeDetailsList.includes(pk_univ_committee_id, index + 1));
            } else {
              this.snotifyService.success(result.message, 'Success!');
            }
          } else {
            this.snotifyService.error(result.message, 'Error!');
          }
        }, error => {
          this.spinner.hide();
          if (error.error.statusCode === 401) {
            this.snotifyService.error(error.error.message, 'Error!');
            this.genericFunctions.logOut(this.router.url);
          } else {
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
        });
  }
  selectedCourse(course_code){
    this.flag=false
    this.academicYear=[];
    this.academicYearDuplicateList=[]
    this.evaluatorForm.get('ExamMonthYear').setValue('')
    this.evaluatorForm.get('AcademicYear').setValue('')
    this.evaluatorForm.get('examId').setValue('')
    for(let i=0;i<this.filtersDetailsList.length;i++){
              if(this.filtersDetailsList[i].course_code==course_code){
                    this.academicYear.push(this.filtersDetailsList[i])
                    const academicYear = this.academicYear.map(({ academic_year }) => academic_year);
                    this.academicYearDuplicateList = this.academicYear.filter(({ academic_year }, index) =>
                    !academicYear.includes(academic_year, index + 1));
                  
              }
    }
    this.evaluatorForm.get('AcademicYear').setValue(this.academicYearDuplicateList[0]?.academic_year)
    this.selectedAcademicyr(this.evaluatorForm.value.AcademicYear)
  }
  selectedAcademicyr(academic_year){
    this.flag=false
    this.monthYear=[];
    this.monthYearDuplicateList=[]
    this.monthYearData=[]
    this.evaluatorForm.get('ExamMonthYear').setValue('')
    this.evaluatorForm.get('examId').setValue('')
    this.evaluatorForm.get('ExamDate').setValue('')

    for(let i=0;i<this.filtersDetailsList.length;i++){
              if(this.filtersDetailsList[i].course_code==this.evaluatorForm.value.CourseCode && this.filtersDetailsList[i].academic_year==academic_year){
                    this.monthYearData.push(this.filtersDetailsList[i])
                    const exam_month_yrData = this.monthYearData.map(({ exam_month_yr }) => exam_month_yr);
                    this.monthYear = this.monthYearData.filter(({ exam_month_yr }, index) =>
                    !exam_month_yrData.includes(exam_month_yr, index + 1));
                    this.monthYear=this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
                    this.monthYearDuplicateList=this.monthYear.sort((a, b) => new Date(b.exam_month_yr).getTime() - new Date(a.exam_month_yr).getTime());
                   
              }
    }
    this.evaluatorForm.get('ExamMonthYear').setValue(this.monthYearDuplicateList[0]?.exam_month_yr)
    this.selectedMonthyr(this.evaluatorForm.value.ExamMonthYear)
  }
  selectedMonthyr(monthYear){
    this.flag=false
    this.examList=[];
    this.ExamDuplicateList=[]
    this.ExamListData=[]
    this.evaluatorForm.get('examId').setValue('')
    this.evaluatorForm.get('ExamDate').setValue('')
    for(let i=0;i<this.filtersDetailsList.length;i++){
              if(this.filtersDetailsList[i].course_code==this.evaluatorForm.value.CourseCode && 
                this.filtersDetailsList[i].academic_year==this.evaluatorForm.value.AcademicYear && 
                 this.filtersDetailsList[i].exam_month_yr==monthYear){
                    this.ExamListData.push(this.filtersDetailsList[i])
                    const ExamListData = this.ExamListData.map(({ exam_name }) => exam_name);
                    this.examList = this.ExamListData.filter(({ exam_name }, index) =>
                    !ExamListData.includes(exam_name, index + 1));
                    
                    // this.monthYearDuplicateList = this.monthYear.sort((a, b) => a.exam_month_yr - b.exam_month_yr);
              }
    }
    this.evaluatorForm.get('examId').setValue(this.examList[0]?.fk_exam_id)
    this.selectedExam(this.evaluatorForm.value.examId)
  }
 
  selectedExam(examId){
    this.examDateList=[];
    this.ExamDateDuplicateList=[]
    this.ExamDateListData=[]
    this.evaluatorForm.get('ExamDate').setValue('')
    for(let i=0;i<this.filtersDetailsList.length;i++){
              if(this.filtersDetailsList[i].course_code==this.evaluatorForm.value.CourseCode && 
                this.filtersDetailsList[i].academic_year==this.evaluatorForm.value.AcademicYear && 
                this.filtersDetailsList[i].exam_month_yr==this.evaluatorForm.value.ExamMonthYear && this.filtersDetailsList[i].fk_exam_id==examId){
                    this.examDateList.push(this.filtersDetailsList[i])
                    const examDateList = this.examDateList.map(({ exam_date }) => exam_date);
                    this.ExamDateListData = this.examDateList.filter(({ exam_date }, index) =>
                    !examDateList.includes(exam_date, index + 1));
                    this.ExamDateListData=this.ExamDateListData.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
                    this.ExamDateDuplicateList=this.ExamDateListData.sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());
                  
              }
    }
    this.evaluatorForm.get('ExamDate').setValue(this.ExamDateListData[0]?.exam_date)
    this.selectedExamDate(this.evaluatorForm.value.ExamDate)
    this.exam_name =this.examList.filter(x => (x.fk_exam_id === examId))[0].exam_name;
    this.examTimetableId =this.examList.filter(x => (x.fk_exam_id === examId))[0].fk_exam_timetable_id;
   
  }
  selectedExamDate(examdate){
    this.flag=false
    this.examSessionsList=[];
    this.examSessions=[]
    this.evaluatorForm.get('examSessionId').setValue('')
    for(let i=0;i<this.filtersDetailsList.length;i++){
              if(this.filtersDetailsList[i].course_code==this.evaluatorForm.value.CourseCode && 
                this.filtersDetailsList[i].academic_year==this.evaluatorForm.value.AcademicYear && 
                this.filtersDetailsList[i].exam_month_yr==this.evaluatorForm.value.ExamMonthYear && 
                this.filtersDetailsList[i].fk_exam_id==this.evaluatorForm.value.examId &&
                this.filtersDetailsList[i].exam_date==examdate ){
                    this.examSessionsList.push(this.filtersDetailsList[i])
                    const examSessions = this.examSessionsList.map(({ exam_session_name }) => exam_session_name);
                    this.examSessions = this.examSessionsList.filter(({ exam_session_name }, index) =>
                    !examSessions.includes(exam_session_name, index + 1));
                   
                  
              }
    }
    this.evaluatorForm.get('examSessionId').setValue(this.examSessions[0]?.fk_exam_session_id)
    this.selectedSession(this.evaluatorForm.value.examSessionId)
    
   }
   selectedSession(examSessionIds){
    this.examTimetableId =this.examSessions.filter(x => (x.fk_exam_session_id == examSessionIds))[0].fk_exam_timetable_id;

  }
 searchMonthYear(value) {
  this.monthYearDuplicateList = []
  this.searchMonthYears(value);
}
searchMonthYears(value: string) {
  let filter = value.toLowerCase();
  for (let i = 0; i < this.monthYear.length; i++) {
    let option = this.monthYear[i];
    if (option.exam_month_yr.toLowerCase().indexOf(filter) >= 0) {
      this.monthYearDuplicateList.push(option);
    }
  }
}
searchExamDate(value) {
  this.ExamDateDuplicateList = []
  this.searchExamDates(value);
}
searchExamDates(value: string) {
  let filter = value.toLowerCase();
  for (let i = 0; i < this.ExamDateListData.length; i++) {
    let option = this.ExamDateListData[i];
    if (option.exam_date.toLowerCase().indexOf(filter) >= 0) {
      this.ExamDateDuplicateList.push(option);
    }
  }
}
  getList(){
    this.flag=true
    this.roomsummaryDetailsList=[]
    this.DetailsList=[]
    this.studentsummaryDetailsList=[]
    this.studentDetailsList=[]
    this.dataSource = new MatTableDataSource([]);
    this.dataSource1 = new MatTableDataSource([]);
    this.studentsummaryDetails = new MatTableDataSource([]);
    this.studentDetails = new MatTableDataSource([]);
    let request = [
      {paramName: 'in_flag', paramValue: 'exam_room_student_allotment_details,exam_room_allotment_details'},
      {paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId')},
      {paramName: 'in_college_id', paramValue: 0},
      {paramName: 'in_academic_year_id', paramValue: 0},
      {paramName: 'in_isadmin', paramValue: 0},
    {paramName: 'in_exam_id', paramValue: this.evaluatorForm.value.examId},
      {paramName: 'in_timetable_id', paramValue: this.examTimetableId},
      {paramName: 'in_exam_date', paramValue: '1990-01-01'},
      { paramName: 'in_subject_id', paramValue: 0 },
      {paramName: 'in_loginuser_empid', paramValue: 0},
      {paramName: 'in_loginuser_roleid', paramValue: 0}
		 
    ];
    this.crudService.getDetailsByRequest(this.getCollegeExamDetails, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.roomsummaryDetailsList = result.data.result[0];
              this.DetailsList = result.data.result[1];
              this.studentsummaryDetailsList=result.data.result[2];
              this.studentDetailsList=result.data.result[3];

              this.dataSource = new MatTableDataSource(this.DetailsList);
              setTimeout(()=>this.dataSource.paginator = this.paginator);
              this.dataSource.sort = this.sort;

              this.dataSource1 = new MatTableDataSource(this.roomsummaryDetailsList);
              setTimeout(()=>this.dataSource1.paginator = this.paginator1);
              this.dataSource1.sort = this.sort;
              this.studentsummaryDetails = new MatTableDataSource(this.studentsummaryDetailsList);
              setTimeout(()=>this.studentsummaryDetails.paginator = this.studentSummarypaginator);
              this.studentsummaryDetails.sort = this.studentSummarysort;
              this.studentDetails = new MatTableDataSource(this.studentDetailsList);
              setTimeout(()=>this.studentDetails.paginator = this.studentDetailspaginator);
              this.studentDetails.sort = this.studentDetailssort;
            } else {
              this.snotifyService.success(result.message, 'Success!');
            }
          } else {
            this.snotifyService.error(result.message, 'Error!');
          }
        }, error => {
          this.spinner.hide();
          if (error.error.statusCode === 401) {
            this.snotifyService.error(error.error.message, 'Error!');
            this.genericFunctions.logOut(this.router.url);
          } else {
            this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          }
        });
  }
  
//  calDays(): void{
//   this.examDate = this.genericFunctions.momentWithDateFormatYMD(this.evaluatorForm.value.examDate); // new Date(this.data.issueTodate);
  
//  }
 
applyFilter(filterValue,value){
  if(value=='roomsummary'){
    this.dataSource1.filter = filterValue.trim().toLowerCase();
    if (this.dataSource1.paginator) {
        this.dataSource1.paginator.firstPage();
    }
  }
  else if(value=='roomdetail'){
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
    }
  }
  else if(value=='studentSummary'){
    this.studentsummaryDetails.filter = filterValue.trim().toLowerCase();
    if (this.studentsummaryDetails.paginator) {
        this.studentsummaryDetails.paginator.firstPage();
    }
  }
  else{
    this.studentDetails.filter = filterValue.trim().toLowerCase();
    if (this.studentDetails.paginator) {
        this.studentDetails.paginator.firstPage();
    }
  }
 
}

clickEvent(row,value){
  this.BookedList=[]
  this.dataSource= new MatTableDataSource([]);
if(value=='Booked'){
  this.BookedList=this.DetailsList.filter(x=>x.pk_exam_room_allotment_id==row.pk_exam_room_allotment_id && x.hallticket_number!=null)
  this.dataSource= new MatTableDataSource(this.BookedList);
  setTimeout(()=>this.dataSource.paginator = this.paginator);
              this.dataSource.sort = this.sort;

}
else if(value=='available'){
  this.BookedList=this.DetailsList.filter(x=>x.pk_exam_room_allotment_id==row.pk_exam_room_allotment_id && x.hallticket_number==null)
  this.dataSource= new MatTableDataSource(this.BookedList);
  setTimeout(()=>this.dataSource.paginator = this.paginator);
              this.dataSource.sort = this.sort;
}
else{
  this.dataSource= new MatTableDataSource(this.DetailsList);
  setTimeout(()=>this.dataSource.paginator = this.paginator);
              this.dataSource.sort = this.sort;
}
}
clickStudentSummary(row,value){
  this.StudentList=[]
  this.studentDetails= new MatTableDataSource([]);
if(value=='SeatAllotment'){
  this.StudentList=this.studentDetailsList.filter(x=>x.pk_exam_timetable_det_id==row.pk_exam_timetable_det_id && x.room_name!=null)
  this.studentDetails= new MatTableDataSource(this.StudentList);
  setTimeout(()=>this.studentDetails.paginator = this.paginator);
              this.studentDetails.sort = this.sort;

}
else if(value=='UnAssignedStudents'){
  this.StudentList=this.studentDetailsList.filter(x=>x.pk_exam_timetable_det_id==row.pk_exam_timetable_det_id && x.room_name==null)
  this.studentDetails= new MatTableDataSource(this.StudentList);
  setTimeout(()=>this.studentDetails.paginator = this.paginator);
              this.studentDetails.sort = this.sort;
}
else{
  this.studentDetails= new MatTableDataSource(this.studentDetailsList);
  setTimeout(()=>this.studentDetails.paginator = this.paginator);
              this.studentDetails.sort = this.sort;
}
}
}
