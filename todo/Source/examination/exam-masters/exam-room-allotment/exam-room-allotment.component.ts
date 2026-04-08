import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { SnotifyService } from 'ng-snotify';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { College } from 'app/main/models/college';
import { AcademicYear } from 'app/main/models/academicYear';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { AssignSeatingComponent } from './assign-seating/assign-seating.component';

@Component({
  selector: 'app-exam-room-allotment',
  templateUrl: './exam-room-allotment.component.html',
  styleUrls: ['./exam-room-allotment.component.scss']
})

export class ExamRoomAllotmentComponent implements OnInit {

    displayedColumns: string[] = ['id',  'examDate','examSessionName', 'roomCode', 'bookedSeats', 'blockedSeats', 'availableSeats', 'isActive',  'actions'];
    dataSource: MatTableDataSource<any>;

    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;

    private examFiltersByCodeUrl = CONSTANTS.examFiltersByCodeUrl;
    private examRoomAllotmentCrudUrl = CONSTANTS.examRoomAllotmentCrudUrl;
    private isActive = CONSTANTS.isActive;
    private getExamMasterDetailsUrl = CONSTANTS.getExamMasterDetailsUrl;
    private examTimetableUrl = CONSTANTS.examTimetableUrl;
    private seatingAllSessionUrl = CONSTANTS.seatingAllSessionUrl;
    private getExamAllotmentDetailsUrl = CONSTANTS.getExamAllotmentDetailsUrl;
    private examInvigilationAllotmentUrl = CONSTANTS.examInvigilationAllotmentUrl;
    private getDetailsByExamTimetableIdUrl = CONSTANTS.getDetailsByExamTimetableIdUrl;
    private examStudentRegistrationDetailsUrl = CONSTANTS.examStudentRegistrationDetailsUrl;
    private popExamInvigilatorUrl = CONSTANTS.popExamInvigilatorUrl;

    staffForm: FormGroup;
    colleges: College[] = [];
    academicYears: AcademicYear[] = [];
    courses: any[] = [];
    roomAllotments: any[] = [];
    examsList: any[] = [];
    examDuplicateList = [];
    pageParams: any = {};
    step = 0;  
    flag = false;
    panelOpenState = true;
    universityId;
    Z = [];
    examListDetails = [];
    filtersDetailsList = [];
    collegeFilterDetails = [];
    CollegesListDetails = [];
    academicYearsList = [];
    examsLists = [];
    subjectListDetails = [];
    regulationsList = [];
    regulations = [];
    allocations: any = [];
    allocationsRoomSubject: any = [];
    groupedAllocations: any[] = [];
    groupedSubjectAllocations: any[] = [];
    exam_name: any = '';
    examTimetables: any[] = [];
    examTimetable: any = {};
    groupedSubjects: any[] = [];
    studentAllotmentDetails = [];
    groupedData = [];
    printAttendance = false;
    printInvigilators = false;
    isCoverSlip = false;
    isPackingSlip = false;
    universityCode:any;
    examInvigilationAllotmentsList = [];
    allocationsGroupedByRoom = [];
    coverSlipData = [];
    groupedCoverSlipData = [];
    packingSlipData = [];
    currentDateTime: string = '';

    constructor(private formBuilder: FormBuilder, private dialog: MatDialog, private snotifyService: SnotifyService, private genericFunctions: GenericFunctions,
                private crudService: CrudService, private spinner: NgxSpinnerService, public router: Router, private route: ActivatedRoute) {
    }

    // tslint:disable-next-line:typedef
    ngOnInit() {
        this.staffForm = this.formBuilder.group({
            collegeId: ['', Validators.required], 
            academicYearId: ['', Validators.required], 
            courseId: ['', Validators.required],
            examTypeId: [''],
            examId: ['', Validators.required], 
            examTimetableId: ['', Validators.required],
        });

        this.route.queryParams
        .subscribe(params => {
            if (!this.isEmptyObject(params)){
                this.pageParams.collegeId = +params.collegeId;
                this.pageParams.examId = +params.examId;
                this.pageParams.academicYearId = +params.academicYearId;
                this.pageParams.courseId = +params.courseId;
                this.pageParams.examTimetableId = +params.examTimetableId;
            }
        });
        this.dataSource = new MatTableDataSource(this.roomAllotments); 
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.getExamFiltersList();
     
    }

     formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = `0${date.getDate()}`.slice(-2); // adds 0 prefix
    const month = `0${date.getMonth() + 1}`.slice(-2); // Month is 0-based
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  printTable(type: string) {
  let printContents;
  if (type === 'Room') {
    printContents = document.getElementById('print-room-section')?.innerHTML;
  }else if(type === 'RoomSubject') {
    printContents = document.getElementById('print-room-subject-section')?.innerHTML;
  }
  else {
    printContents = document.getElementById('print-group-section')?.innerHTML;
  }

  if (printContents) {
    const popupWin = window.open('', '_blank', 'width=800,height=600');
    if (popupWin) {
      popupWin.document.open();
      popupWin.document.write(`
        <html>
          <head>
            <title>Print Table</title>
            <link rel="stylesheet" type="text/css" href="assets/css/examPrint.scss">
            <style>
              body { margin: 0; font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            ${printContents}
            <script>
              window.onload = function () {
                window.print();
              };
              window.onafterprint = function () {
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      popupWin.document.close();
    }
  }
}

get isExamTimetableEmpty(): boolean {
  return !!this.examTimetable && Object.keys(this.examTimetable).length === 0;
}

    getProcs(){
      this.allocations = [];
      this.groupedSubjects = [];
      this.allocationsRoomSubject = [];
      this.allocationsGroupedByRoom = [];
      this.groupedSubjectAllocations = [];
      this.groupedAllocations = [];
        let timetable = this.examTimetable;
        let request = [
          { paramName: 'in_flag', paramValue: 'roomwise_allotment_summary' },
          { paramName: 'in_college_id', paramValue: 0 },
          { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
          { paramName: 'in_course_group_id', paramValue: 0 },
          { paramName: 'in_course_year_id', paramValue: 0 },
          { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
          { paramName: 'in_invgilator_emp_id', paramValue: 0 },
          { paramName: 'in_regulation_id', paramValue: 0 },
          { paramName: 'in_subject_id', paramValue: 0 },
          { paramName: 'in_session_id', paramValue: timetable.examSessionId },
          { paramName: 'in_std_id', paramValue: 0 },
          { paramName: 'in_room_id', paramValue: 0 },
          { paramName: 'from_exam_date', paramValue: timetable.examDate },
          { paramName: 'to_exam_date', paramValue: timetable.examDate },
        ];
        this.crudService.getDetailsByRequest('getAllRecords/s_get_exam_allotment_details', '', request, '&')
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
                if (result.success){
                  this.allocations = result.data.result[0];
                  const grouped = this.allocations.reduce((acc, curr) => {
                  if (!acc[curr.room_name]) {
                    acc[curr.room_name] = [];
                  }
                  acc[curr.room_name].push(curr);
                  return acc;
                }, {} as { [key: string]: any[] });

                this.groupedAllocations = Object.keys(grouped).map((roomName) => ({
                  room_name: roomName,
                  records: grouped[roomName]
                }));
                }
            } else {
              // this.snotifyService.error(result.message, 'Error!');
            }
          }, error => {
           // this.spinner.hide();
            if (error.error.statusCode === 401) {
              this.snotifyService.error(error.error.message, 'Error!');
              this.genericFunctions.logOut(this.router.url);
            } else {
              this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            }
          });

          let request1 = [
          { paramName: 'in_flag', paramValue: 'groupwise_allotment_summary' },
           { paramName: 'in_college_id', paramValue: 0 },
          { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
          { paramName: 'in_course_group_id', paramValue: 0 },
          { paramName: 'in_course_year_id', paramValue: 0 },
          { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
          { paramName: 'in_invgilator_emp_id', paramValue: 0 },
          { paramName: 'in_regulation_id', paramValue: 0 },
          { paramName: 'in_subject_id', paramValue: 0 },
          { paramName: 'in_session_id', paramValue: timetable.examSessionId },
          { paramName: 'in_std_id', paramValue: 0 },
          { paramName: 'in_room_id', paramValue: 0 },
          { paramName: 'from_exam_date', paramValue: timetable.examDate },
          { paramName: 'to_exam_date', paramValue: timetable.examDate },
        ];
        this.crudService.getDetailsByRequest('getAllRecords/s_get_exam_allotment_details', '', request1, '&')
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
                if (result.success){
                let res = result.data.result[0];

                const subjectsMap = new Map<string, any>();

                res.forEach((item: any) => {
                  if (!subjectsMap.has(item.subject_name)) {
                    subjectsMap.set(item.subject_name, []);
                  }
                  subjectsMap.get(item.subject_name)!.push(item);
                });
                let finalGrouped: any[] = [];

                let sno = 1;

                subjectsMap.forEach((subjectAllocations, subjectName) => {
                  const branchMap = new Map<string, any[]>();

                  subjectAllocations.forEach((item: any) => {
                    if (!branchMap.has(item.group_code)) {
                      branchMap.set(item.group_code, []);
                    }
                    branchMap.get(item.group_code)!.push(item);
                  });

                  const groupedBranches = Array.from(branchMap.entries()).map(([branch, entries]) => {
                    return {
                      sno: sno++,        // You can reset sno per subject if needed
                      branch,
                      allocations: entries
                    };
                  });

                  finalGrouped.push({
                    subject_name: subjectName,
                    branches: groupedBranches
                  });
                });

                this.groupedSubjects = finalGrouped;
                console.log(this.groupedSubjects,"this.groupedSubjects");
                }
            } else {
              // this.snotifyService.error(result.message, 'Error!');
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

    let request3 = [
          { paramName: 'in_flag', paramValue: 'roomwise_subject_summary' },
          { paramName: 'in_college_id', paramValue: 0 },
          { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
          { paramName: 'in_course_group_id', paramValue: 0 },
          { paramName: 'in_course_year_id', paramValue: 0 },
          { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
          { paramName: 'in_invgilator_emp_id', paramValue: 0 },
          { paramName: 'in_regulation_id', paramValue: 0 },
          { paramName: 'in_subject_id', paramValue: 0 },
          { paramName: 'in_session_id', paramValue: timetable.examSessionId },
          { paramName: 'in_std_id', paramValue: 0 },
          { paramName: 'in_room_id', paramValue: 0 },
          { paramName: 'from_exam_date', paramValue: timetable.examDate },
          { paramName: 'to_exam_date', paramValue: timetable.examDate },
        ];
        this.crudService.getDetailsByRequest('getAllRecords/s_get_exam_allotment_details', '', request3, '&')
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
                if (result.success){
                      this.allocationsRoomSubject = result.data.result[0];
                      const grouped = this.allocationsRoomSubject.reduce((acc, curr) => {
                      if (!acc[curr.room_name]) {
                        acc[curr.room_name] = [];
                      }
                      acc[curr.room_name].push(curr);
                      return acc;
                    }, {} as { [key: string]: any[] });

                    this.groupedSubjectAllocations = Object.keys(grouped).map((roomName) => ({
                      room_name: roomName,
                      records: grouped[roomName]
                    }));
                }
            } else {
              // this.snotifyService.error(result.message, 'Error!');
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
    getTotal(): any{
      return this.allocations.reduce((sum, item) => sum + item.cnt, 0);
    }

    getSubjectRoomTotal(): any{
      return this.allocationsRoomSubject.reduce((sum, item) => sum + item.cnt, 0);
    }
    getExamFiltersList(): void {
        this.spinner.show();
        let request = [
          { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
          { paramName: 'in_flag_type', paramValue: 'ALL' },
          { paramName: 'in_university_id', paramValue: 0 },
          { paramName: 'in_univ_examcenter_id', paramValue: 0 },
          { paramName: 'in_college_id', paramValue: 0 },
          { paramName: 'in_course_id', paramValue: 0 },
          { paramName: 'in_course_group_id', paramValue: 0 },
          { paramName: 'in_course_year_id', paramValue: 0 },
          { paramName: 'in_exam_id', paramValue: 0 },
          { paramName: 'in_academic_year_id', paramValue: 0 },
          { paramName: 'in_regulation_id', paramValue: 0 },
          { paramName: 'in_subject_id', paramValue: 0 },
          { paramName: 'in_sub_flag_type', paramValue: '' },
          { paramName: 'in_param1', paramValue: 0 },
          { paramName: 'in_param2', paramValue: 0 },
          { paramName: 'in_loginuser_roleid', paramValue: 0 },
          { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
        ];
        this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.filtersDetailsList = result.data.result;
                for (const list of this.filtersDetailsList) {
                  if (list?.length > 0 && list[0].flag === 'univ_exam_filters') {
                    this.examListDetails = list;
                    break;
                  }
                }
                if (this.examListDetails && this.examListDetails.length > 0) {
                  const courseList = this.examListDetails.map(({ fk_course_id }) => fk_course_id);
                  this.courses = this.examListDetails.filter(({ fk_course_id }, index) =>
                    !courseList.includes(fk_course_id, index + 1));
                  if (!this.isEmptyObject(this.pageParams) && this.courses.length > 0){
                    if (this.courses.filter(x => (x.fk_course_id === this.pageParams.courseId)).length > 0){
                      this.staffForm.get('courseId').setValue(+this.pageParams.courseId); 
                      this.selectedCourse(this.staffForm.value.courseId);  
                    }
                  }  
                }
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
    selectedCourse(courseId): void{
        this.staffForm.get('academicYearId').setValue('');
        this.staffForm.get('examId').setValue('');
        this.staffForm.get('collegeId').setValue('');
        this.flag = false;
        this.roomAllotments = [];
        this.academicYears = [];
        this.examsList = [];
        this.examDuplicateList = [];
        this.academicYearsList = [];
        this.CollegesListDetails = [];
        this.examsLists = [];
        this.colleges = [];
        this.examTimetables = [];
        this.studentAllotmentDetails = [];
        this.groupedData = [];
        this.coverSlipData = [];    
        this.groupedCoverSlipData = [];
        this.packingSlipData = [];
        this.printAttendance = false;
        this.printInvigilators = false;
        this.isCoverSlip = false;
        this.isPackingSlip = false;
        this.dataSource = new MatTableDataSource(this.roomAllotments);
        this.universityCode = this.courses.filter(x => (x.fk_course_id === this.staffForm.value.courseId))[0]?.university_code;
      //  this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
      if (courseId != null && courseId !== undefined) {
        this.academicYearsList = this.examListDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId))
        if (this.academicYearsList.length > 0) {
          const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
          this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) =>
         !academicYears.includes(fk_academic_year_id, index + 1));
        }
        if (!this.isEmptyObject(this.pageParams) && this.academicYears.length > 0){
            if (this.academicYears.filter(x => (x.fk_academic_year_id === this.pageParams.academicYearId)).length > 0){
              this.staffForm.get('academicYearId').setValue(+this.pageParams.academicYearId);
              this.academicYears = this.academicYears.sort((a,b)=>parseInt(b.academic_year)-parseInt(a.academic_year));
              this.selectedAcademicYear(this.staffForm.value.academicYearId);  
            }
          } 
      }
    }
    selectedAcademicYear(academicYearId): void{
      this.staffForm.get('examTypeId').setValue(0);
      this.selectedExamType(0);
  }
  selectedExamType(examTypeId){
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('collegeId').setValue('');
    this.flag = false;
    this.examsList = [];
      this.examTimetables = [];
    this.CollegesListDetails = [];
    this.examDuplicateList = [];
    this.roomAllotments = [];
    this.examsLists = [];
    this.colleges = [];
    this.studentAllotmentDetails = [];
    this.groupedData = [];
    this.coverSlipData = [];
    this.groupedCoverSlipData = [];
    this.packingSlipData = [];
    this.printAttendance = false;
    this.printInvigilators = false;
    this.isCoverSlip = false;
    this.isPackingSlip = false;
    this.dataSource = new MatTableDataSource(this.roomAllotments);
    if (this.staffForm.value.academicYearId !== null && this.staffForm.value.academicYearId !== undefined){
  /*-----------Exams -----------*/      
  // tslint:disable-next-line:max-line-length
  this.examsLists = this.examListDetails.filter(x => (x.fk_course_id === this.staffForm.value.courseId && x.fk_academic_year_id === this.staffForm.value.academicYearId))
  const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) =>
             !examsLists.includes(fk_exam_id, index + 1));
        // this.examDuplicateList = this.examsList;
  if(examTypeId === 1){
      this.examDuplicateList  = this.examsList.filter(x => x.is_internal_exam);
    }else{
      this.examDuplicateList  = this.examsList.filter(x => !x.is_internal_exam);
    }
  if (!this.isEmptyObject(this.pageParams) && this.examsList.length > 0){
    if (this.examsList.filter(x => (x.fk_exam_id === this.pageParams.examId)).length > 0){
      this.staffForm.get('examId').setValue(+this.pageParams.examId);  
      this.selectedExam(this.pageParams.examId);  
    }
  } 
  }
  }
  selectedExam(examId): void{
    this.staffForm.get('collegeId').setValue('');
    this.exam_name = this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].exam_name;
    this.flag = false;
    this.CollegesListDetails = [];
    this.colleges = [];
    this.examTimetables = [];
    this.roomAllotments = [];
    this.studentAllotmentDetails = [];
    this.groupedData = [];
    this.coverSlipData = [];
    this.groupedCoverSlipData = [];
    this.packingSlipData = [];
    this.printAttendance = false;
    this.printInvigilators = false;
    this.isCoverSlip = false;
    this.isPackingSlip = false;
    this.dataSource = new MatTableDataSource(this.roomAllotments);
    /*----------- COLLEGES -----------*/
    if (examId != null && examId !== undefined) {
          let request = [
            { paramName: 'in_flag', paramValue: 'univ_exam_rest_in_tt' },
            { paramName: 'in_flag_type', paramValue: 'REGSUP' },
            { paramName: 'in_university_id', paramValue: 0 },
            { paramName: 'in_univ_examcenter_id', paramValue: 0 },
            { paramName: 'in_college_id', paramValue: 0 },
            { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
            { paramName: 'in_course_group_id', paramValue: 0 },
            { paramName: 'in_course_year_id', paramValue: 0 },
            { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
            { paramName: 'in_academic_year_id', paramValue: this.staffForm.value.academicYearId },
            { paramName: 'in_regulation_id', paramValue: 0 },
            { paramName: 'in_subject_id', paramValue: 0 },
            { paramName: 'in_sub_flag_type', paramValue: '' },
            { paramName: 'in_param1', paramValue: 0 },
            { paramName: 'in_param2', paramValue: 0 },
            { paramName: 'in_loginuser_roleid', paramValue: 0 },
            { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
          ];
          this.crudService.getDetailsByRequest(this.examFiltersByCodeUrl, '', request, '&')
            .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200) {
                if (result.data && result.data !== '' && result.data.result.length > 0) {
                  this.collegeFilterDetails = result.data.result;
                  for (const list of this.collegeFilterDetails) {
                    if (list?.length > 0 && list[0].flag === 'univ_exam_rest_filters') {
                      this.CollegesListDetails = list;
                      break;  // Stop looping once we find the first match
                    }
                  }
                  const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
                  this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) =>
                    !CollegeIdData.includes(fk_college_id, index + 1));
              
                   this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
                  if (!this.isEmptyObject(this.pageParams) && this.colleges.length > 0){
                    this.staffForm.get('collegeId').setValue(+this.pageParams.collegeId);
                    this.selectedCollege(+this.pageParams.collegeId);
                }
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

            /*----------- Timetables -----------*/
            this.crudService.listDetailsByTwoIds(this.examTimetableUrl, examId, 'true',
                                                   this.getExamMasterDetailsUrl, this.isActive)
                .subscribe(result => {
                    if (result.statusCode === 200) {
                        if (result.data.resultList && result.data.resultList !== '') {
                            this.examTimetables = result.data.resultList;
                            this.examTimetables=this.examTimetables.sort
                            ((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
                              if (this.examTimetables.filter(x => (x.examTimetableId === +this.pageParams.examTimetableId)).length > 0){
                                   this.staffForm.get('examTimetableId').setValue(+this.pageParams.examTimetableId);
                                   this.selectedExamTimetable(this.staffForm.value.examTimetableId);
                              }
                               } else {
                            this.snotifyService.success(result.message, 'Success!');
                        }
                    } else {
                        this.snotifyService.error(result.message, 'Error!');
                    }

                }, error => {
                    if (error.error.statusCode === 401) {
                        this.snotifyService.error(error.error.message, 'Error!');
                        this.genericFunctions.logOut(this.router.url);
                    } else {
                        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                    }
                });
        }
}

selectedExamTimetable(examTimetableId: any){
  this.studentAllotmentDetails = [];
  this.coverSlipData = [];
  this.groupedCoverSlipData = [];
  this.packingSlipData = [];
  this.groupedData = [];
  this.printAttendance = false;
  this.printInvigilators = false;
  this.isCoverSlip = false;
  this.isPackingSlip = false;
  if(this.examTimetables.filter(x=>(x.examTimetableId === this.staffForm.value.examTimetableId)).length > 0)
  this.examTimetable = this.examTimetables.filter(x=>(x.examTimetableId === this.staffForm.value.examTimetableId))[0];
  this.selectedCollege(this.staffForm.value.collegeId);
  this.SelectedTimetabelEmployees(this.staffForm.value.examTimetableId);
  // this.getstudentBarcode();
}

searchExam(value) {
    this.examDuplicateList = []
    this.searchExamList(value);
  }
  searchExamList(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.examsList.length; i++) {
      let option = this.examsList[i];
      if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
        this.examDuplicateList.push(option);
      }
    }
  }
    isEmptyObject(obj) {
        return (obj && (Object.keys(obj).length === 0));
    }

    /*--------- GET ROOM ALLOTMENTS ----------*/
    selectedCollege(examId): void{
        this.roomAllotments = [];
        this.flag = false;
        this.dataSource = new MatTableDataSource(this.roomAllotments);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.printAttendance = false;
        this.printInvigilators = false;
        this.isCoverSlip = false;
        this.isPackingSlip = false;
        this.getProcs();
        this.getstudentBarcode();
        this.getCoverSlipList();
        this.spinner.show();
        let item = this.examTimetables.filter(x=>(x.examTimetableId === this.staffForm.value.examTimetableId))[0];
        if (examId != null && this.staffForm.valid){
            this.spinner.show();          
            this.crudService.listDetailsByTwoIds(this.examRoomAllotmentCrudUrl, this.staffForm.value.examId, this.staffForm.value.examTimetableId, this.getExamMasterDetailsUrl, 'ExamTimetable.examTimetableId')
            .subscribe(result => {
                this.spinner.hide();
                this.flag = true;
                if (result.statusCode === 200){
                    if (result.data.resultList && result.data.resultList.length > 0) {
                        this.roomAllotments = result.data.resultList;
                        this.dataSource = new MatTableDataSource(this.roomAllotments);
                        this.dataSource.paginator = this.paginator;
                        this.dataSource.sort = this.sort;
                    } else {
                        this.snotifyService.success(result.message, 'Success!');
                    }
                }else {
                    this.snotifyService.error(result.message, 'Error!');
            }
            }, error => {
                this.spinner.hide();
                if (error.error.statusCode === 401){
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                }else{
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
        }
    }

    // tslint:disable-next-line:typedef
    applyFilter(filterValue: string) {
        this.dataSource.filter = filterValue.trim().toLowerCase();
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    copyExistingSeating(): void{
        if (this.staffForm.valid){
            this.router.navigate(['admin-examination-management/admin-exam-masters/seating-plan-setup/copy-existing-seating'], 
            { queryParams: { collegeId: this.staffForm.value.collegeId,
                             examRoomAllotmentId: null,
                            examId: this.staffForm.value.examId,
                        academicYear: this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year, 
                        academicYearId: this.staffForm.value.academicYearId, 
                        courseId: this.staffForm.value.courseId, 
                        courseCode: this.courses.filter(x => (x.fk_course_id === this.staffForm.value.courseId))[0].course_code,
                            examTimetableId:this.staffForm.value.examTimetableId
                            } });
        }
    }

    addExamRoomAllotment(): void{
        if (this.staffForm.valid){
            this.router.navigate(['admin-examination-management/admin-exam-masters/seating-plan-setup/room-allotment'], 
            { queryParams: { collegeId: this.staffForm.value.collegeId,
                             examRoomAllotmentId: null,
                            examId: this.staffForm.value.examId,
                            academicYear: this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year, 
                            academicYearId: this.staffForm.value.academicYearId, 
                            courseId: this.staffForm.value.courseId, 
                            courseCode: this.courses.filter(x => (x.fk_course_id === this.staffForm.value.courseId))[0].course_code,
                            examDate:this.examTimetable.examDate,
                            examTimetableId:this.staffForm.value.examTimetableId
                            } });
        }
    }

    editExamRoomAllotment(row): void{
        if (this.staffForm.valid){
            this.router.navigate(['admin-examination-management/admin-exam-masters/seating-plan-setup/add-exam-room-allotment'], 
            { queryParams: {
                collegeId: row.collegeId, 
                examId: this.staffForm.value.examId, 
                subjectId: row.subjectIds,
                academicYearId: this.staffForm.value.academicYearId, 
                courseId: this.staffForm.value.courseId, 
                academicYear: this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year, 
                courseCode: this.courses.filter(x => (x.fk_course_id === this.staffForm.value.courseId))[0].course_code, 
                examTimetableId : this.staffForm.value.examTimetableId,
                examRoomAllotmentId: row.examRoomAllotmentId, examDate: row.examDate} });
        }
    }
    AssignSeating(){
        const dialogRef = this.dialog.open(AssignSeatingComponent, {
            width: '400px',
            data: {}
            });
              dialogRef.afterClosed().subscribe(details => {
                if (details != null && details !== ''){
                    // details.examEvaluationAssignmentId = this.rowdata.pk_exam_evaluationassignment_id;
                      this.AssignSeatingAllotment();
                }
            });
        }
        AssignSeatingAllotment(){
        this.spinner.show();
        this.crudService.listByThreeIds(this.seatingAllSessionUrl, 
            this.staffForm.value.examId, 
            this.examTimetable.examDate,
              this.examTimetable.examSessionId,
          'in_exam_id',
          'in_exam_date',
          'in_session_id'
           )
        .subscribe(result => {
         this.flag = true;
            this.spinner.hide();
            if (result.statusCode === 200){
                 if (result.data && result.data !== '' && result.data.result.length > 0) {
                    this.spinner.hide();
                    this.snotifyService.success(result.message, 'Success!');
                    this.flag=false
                    this.selectedCollege(this.staffForm.value.examId);
                 } else {
                     this.snotifyService.success(result.message, 'Success!');  
                 }
            }else {
             this.snotifyService.error(result.message, 'Error!');
         }
         }, error => {            
             if (error.error.statusCode === 401){
                 this.snotifyService.error(error.error.message, 'Error!');
                 this.genericFunctions.logOut(this.router.url);
            }else{
                this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            }
         });
     }
     tConvert(time): any{
        if (time !== null && time !== undefined){
           time = time.toString ().match (/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/) || [time];
           if (time.length > 1) { // If time format correct
             time = time.slice (1);  // Remove full string match value
             time[5] = +time[0] < 12 ? 'AM' : 'PM'; // Set AM/PM
             time[0] = +time[0] % 12 || 12; // Adjust hours
           }
           time = time[0] + time[1] + time[2] + ' ' + time[5];
           return time; 
        }
      }
      getstudentBarcode(): void {
              this.studentAllotmentDetails = [];
              this.groupedData = [];
              this.coverSlipData = [];
              this.groupedCoverSlipData = [];
              this.packingSlipData = [];
              this.printAttendance = false;
              this.printInvigilators = false;
              this.isCoverSlip = false;
              this.isPackingSlip = false;
              let timetable = this.examTimetable;
              this.spinner.show();
                /*----------- STUDENTS -----------*/
                // tslint:disable-next-line:max-line-length
                this.crudService.listByFourteenIds(this.getExamAllotmentDetailsUrl, 'roomwise_OMR_students',
                  this.staffForm.value.examId,
                  0,
                  this.staffForm.value.courseId,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  timetable.examDate,
                  timetable.examDate,
                  0, timetable.examSessionId,
                  'in_flag', 'in_exam_id', 'in_college_id', 'in_course_id', 'in_course_group_id', 'in_course_year_id', 'in_room_id', 'in_std_id', 'in_invgilator_emp_id',
                  'in_regulation_id', 'from_exam_date', 'to_exam_date', 'in_subject_id', 'in_session_id')
                  .subscribe(result => {
                    this.spinner.hide();
                    if (result.statusCode === 200) {
                      if (result.success) {
                        if (result.data.result[0].length > 0) {
                          this.studentAllotmentDetails = result.data.result[0];
                          if (this.studentAllotmentDetails && this.studentAllotmentDetails.length > 0) {
                                const grouped = this.groupByMultipleKeys(this.studentAllotmentDetails, [
                                  'fk_course_group_id',
                                  'fk_subject_id',
                                  'room_id',
                                  'fk_examtype_catdet_id'
                                ]);

                                this.groupedData = Object.keys(grouped).map(key => {
                                  const [fk_course_group_id, fk_subject_id, room_id, fk_examtype_catdet_id] = key.split('|');

                                  // Sort halltickets numerically
                                  const sortedStudents = grouped[key].sort((a, b) => {
                                    return a.hallticket_number.localeCompare(b.hallticket_number, undefined, { numeric: true });
                                  });

                                  return {
                                    fk_course_group_id,
                                    fk_subject_id,
                                    room_id,
                                    fk_examtype_catdet_id,
                                    students: sortedStudents
                                  };
                                });
                              }

                          // if(this.studentAllotmentDetails && this.studentAllotmentDetails.length > 0){
                          //       const grouped = this.groupBy(this.studentAllotmentDetails, 'fk_course_group_id');
                          //         this.groupedData = Object.keys(grouped).map(key => ({
                          //             fk_course_group_id: key,
                          //             students: grouped[key]
                          //         }));
                          // }
                              console.log(this.groupedData,"this.groupedData")
                        } else {
                          this.snotifyService.success('No Records Found.', 'Success!');
                        }
          
                      } else {
                        this.snotifyService.success(result.message, 'Success!');
                      }
                    } else {
                      // this.snotifyService.error(result.message, 'Error!');
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
  groupByMultipleKeys(array: any[], keys: string[]) {
     return array.reduce((result, currentValue) => {
        const compositeKey = keys.map(key => currentValue[key]).join('|'); // use a delimiter
        (result[compositeKey] = result[compositeKey] || []).push(currentValue);
        return result;
     }, {});
}
printAttendanceSheet(_printAttendanceSheet){
        this.printInvigilators = false;
        this.isCoverSlip = false;
        this.isPackingSlip = false;
        this.printAttendance = true;
        setTimeout(() => {
        window.print()
       }, 1000);
    }
printInvigilator(_printInvigilators){
        this.printAttendance = false;
        this.isCoverSlip = false;
        this.isPackingSlip = false;
        this.printInvigilators = true;
        setTimeout(() => {
        window.print()
       }, 1000);
}
    printStickers(){
        JSON.stringify(this.studentAllotmentDetails)
        this.router.navigate(['admin-examination-management/admin-exam-masters/seating-plan-setup/add-exam-room-allotment/print-seating-stickers'],
        {
          queryParams: {
            data: JSON.stringify(this.studentAllotmentDetails),
            academicYearId: this.staffForm.value.academicYearId, 
            courseId: this.staffForm.value.courseId, 
            academicyear: this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year, 
            courseCode: this.courses.filter(x => (x.fk_course_id === this.staffForm.value.courseId))[0].course_code, 
            examTimetableId : this.staffForm.value.examTimetableId,
            collegeCode: this.studentAllotmentDetails[0]?.college_code,
            courseGroupCode: this.studentAllotmentDetails[0]?.group_code,
            courseYear: this.studentAllotmentDetails[0]?.course_year_code,
            CollegeName: this.studentAllotmentDetails[0]?.college_name,
            ExamName: this.studentAllotmentDetails[0]?.exam_name,
            collegeId: this.pageParams.collegeId,
            courseGroupId: this.studentAllotmentDetails[0]?.fk_course_group_id,
            courseYearId: this.studentAllotmentDetails[0]?.fk_course_year_id,
            examId: this.staffForm.value.examId,
            examRoomAllotmentId:this.pageParams.examRoomAllotmentId,
            examDate:this.pageParams.examDate,
            printHn: true,
            barcodeNo: false,
            isBulkPrint: true,
          }
        });
    }
    printGroupStickers(){
      JSON.stringify(this.studentAllotmentDetails)
      this.router.navigate(['admin-examination-management/admin-exam-masters/seating-plan-setup/add-exam-room-allotment/print-group-seating-stickers'],
        {
          queryParams: {
            data: JSON.stringify(this.studentAllotmentDetails),
            academicYearId: this.staffForm.value.academicYearId, 
            courseId: this.staffForm.value.courseId, 
            academicyear: this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year, 
            courseCode: this.courses.filter(x => (x.fk_course_id === this.staffForm.value.courseId))[0].course_code, 
            examTimetableId : this.staffForm.value.examTimetableId,
            collegeCode: this.studentAllotmentDetails[0]?.college_code,
            courseGroupCode: this.studentAllotmentDetails[0]?.group_code,
            courseYear: this.studentAllotmentDetails[0]?.course_year_code,
            CollegeName: this.studentAllotmentDetails[0]?.college_name,
            ExamName: this.studentAllotmentDetails[0]?.exam_name,
            collegeId: this.pageParams.collegeId,
            courseGroupId: this.studentAllotmentDetails[0]?.fk_course_group_id,
            courseYearId: this.studentAllotmentDetails[0]?.fk_course_year_id,
            examId: this.staffForm.value.examId,
            examRoomAllotmentId:this.pageParams.examRoomAllotmentId,
            examDate:this.pageParams.examDate,
            printHn: true,
            barcodeNo: false,
            isBulkPrint: true,
          }
        });
    }
    SelectedTimetabelEmployees(examTimetableId) {
        this.examInvigilationAllotmentsList = [];
        /*----------- Timetables -----------*/
        this.crudService.listDetailsByTwoIds(this.examInvigilationAllotmentUrl,
                examTimetableId, 'true',
                this.getDetailsByExamTimetableIdUrl, 'isActive')
            .subscribe(result => {
                if (result.statusCode === 200) {
                    if (result.data.resultList && result.data.resultList !== '') {
                        this.examInvigilationAllotmentsList = result.data.resultList;
                        console.log(this.examInvigilationAllotmentsList,'this.examInvigilationAllotmentsList')
                    } else {
                        this.snotifyService.success(result.message, 'Success!');
                    }
                } else {
                    // this.snotifyService.error(result.message, 'Error!');
                }

            }, error => {
                if (error.error.statusCode === 401) {
                    this.snotifyService.error(error.error.message, 'Error!');
                    this.genericFunctions.logOut(this.router.url);
                } else {
                    this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
                }
            });
    }
getCoverSlipList(){
        this.coverSlipData = [];
        this.groupedCoverSlipData = [];
        this.packingSlipData = [];
        /*----------- SUBJECTS -----------*/
        let request = [
          { paramName: 'in_flag', paramValue: 'exam_std_att_details' },
          { paramName: 'in_exam_id', paramValue: this.staffForm.value.examId },
          { paramName: 'in_clg_id', paramValue: 0 },
          { paramName: 'in_course_id', paramValue: this.staffForm.value.courseId },
          { paramName: 'in_course_group_id', paramValue: 0 },
          { paramName: 'in_course_year_id', paramValue: 0 },
          { paramName: 'in_regulation_id', paramValue: 0 },
          { paramName: 'in_subject_id', paramValue: 0 },
          { paramName: 'in_examtype_catdet_id', paramValue: 0 },
          { paramName: 'in_std_id', paramValue: 0 },
          { paramName: 'in_exam_timetable_id', paramValue: this.staffForm.value.examTimetableId },
          { paramName: 'in_room_id', paramValue: 0 },
          { paramName: 'in_exam_labbatch_id', paramValue: 0 },
        ];
        this.crudService.getDetailsByRequest(this.examStudentRegistrationDetailsUrl, '', request, '&')
          .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.coverSlipData = result.data.result[0];
                this.packingSlipData = result.data.result[0];
                if(this.coverSlipData && this.coverSlipData.length > 0){
                const groupedMap = new Map();

                this.coverSlipData.forEach(item => {
                  const key = `${item.fk_subject_id}|${item.course_year}|${item.exam_type}`;

                  if (!groupedMap.has(key)) {
                    groupedMap.set(key, {
                      fk_subject_id: item.fk_subject_id,
                      course_year: item.course_year,
                      exam_type: item.exam_type,
                      subject_code: item.subject_code,
                      subject_name: item.subject_name,
                      exam_date: item.exam_date,
                      session_start_time: item.session_start_time,
                      session_end_time: item.session_end_time,
                      course_name: item.course_name,
                      exam_label_name: item.exam_label_name,
                      groups: [],
                      total_present: 0,
                      total_absent: 0,
                      total_malpractice: 0
                    });
                  }

                  const group = groupedMap.get(key);

                  const present = Number(item?.Present) || 0;
                  const absent = Number(item?.Absent) || (Number(item?.registered_for_exam) || 0) - present;
                  const mal = isNaN(Number(item?.mal_practice)) ? 0 : Number(item?.mal_practice);

                  // Only push group if course_group exists or at least one value > 0
                  if (item.course_group && (present > 0 || absent > 0 || mal > 0)) {
                    group.groups.push({
                      course_group: item.course_group,
                      present: present,
                      absent: absent,
                      mal_practice: mal
                    });

                    group.total_present += present;
                    group.total_absent += absent;
                    group.total_malpractice += mal;
                  }
                });

                this.groupedCoverSlipData = Array.from(groupedMap.values());
                }
              } else {
                this.snotifyService.success(result.message, 'Success!');
              }
            } else {
              // this.snotifyService.error(result.message, 'Error!');
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
      printCoverSlip(){
        this.printInvigilators = false;
        this.printAttendance = false;
        this.isPackingSlip = false;
        this.isCoverSlip = true;
        setTimeout(() => {
        window.print()
       }, 1000);
      }
      printPackingSlip(){
        const now = new Date();
        this.currentDateTime = now.toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        this.printInvigilators = false;
        this.printAttendance = false;
        this.isCoverSlip = false;
        this.isPackingSlip = true;
        setTimeout(() => {
        window.print()
       }, 1000);
      }

autoAssign(){
  this.spinner.show();
  let request = [
    {paramName: 'in_flag', paramValue: 'popexaminvigilator'},
    {paramName: 'in_timetable_det_id', paramValue: this.staffForm.value.examTimetableId},
  ];
  this.crudService.getDetailsByRequest(this.popExamInvigilatorUrl,'', request,'&')
  .subscribe(result => {
  this.spinner.hide();
  if (result.statusCode === 200){
       if (result.success) {
        this.snotifyService.success(result.message, 'Success!');
       } else {
           this.snotifyService.success(result.message, 'Success!');
       }
  }else {
       this.snotifyService.error(result.message, 'Error!');
}
}, error => {
   this.spinner.hide();
   if (error.error.statusCode === 401){
       this.snotifyService.error(error.error.message, 'Error!');
       this.genericFunctions.logOut(this.router.url);
   }else{
       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
   }
});
}
  }
