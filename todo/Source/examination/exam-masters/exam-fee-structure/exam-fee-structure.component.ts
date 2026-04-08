import { Component, OnInit, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router, ActivatedRoute } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ViewExamFeeStructureComponent } from './view-exam-fee-structure/view-exam-fee-structure.component';
import { AcademicYear } from 'app/main/models/academicYear';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatRadioChange } from '@angular/material/radio';

@Component({
  selector: 'app-exam-fee-structure',
  templateUrl: './exam-fee-structure.component.html',
  styleUrls: ['./exam-fee-structure.component.scss']
})

export class ExamFeeStructureComponent implements OnInit {

  displayedColumns: string[] = ['id', 'examFeeStructureName', 'examName', 'ApplicableFor', 'ApplicableForend', 'reg', 'sup', 'isActive', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;

  private universitiesUrl = CONSTANTS.universitiesUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private examFeeStructureCrudUrl = CONSTANTS.examFeeStructureCrudUrl;
  private isActive = CONSTANTS.isActive;
  private getExamFiltersBycodeUrl=CONSTANTS.getExamFiltersBycodeUrl;
  private getViewDataUrl = CONSTANTS.getViewDataUrl;

  staffForm: FormGroup;
  universities = [];
  colleges: College[] = [];
  academicYears: AcademicYear[] = [];
  courses: Course[] = [];
  step = 0;  
  examsList: any[] = [];
  pageParams: any = {};
  flag = false;
  collegeName;
  universityCode;
  exams: any[] = [];
  examDuplicateList = [];
  examName;
  fromDate;
  courseName;
  toDate;
  courseId;
  academicYear;
  isInternalExam;
  isRegularExam;
  isSupplyExam;
  check = 1;
  filtersDetailsList = []
  CollegesListDetails = []
  coursesList=[]
  academicYearsList=[];
  examsLists =[]
  examData = [];
  ClgfiltersDetailsList: any[];
  CollegesFiltersListDetails: any[];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router, 
              private dialog: MatDialog, private route: ActivatedRoute, private genericFunctions: GenericFunctions) {         
      
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {  
      
    this.dataSource = new MatTableDataSource(this.examsList);  
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.staffForm = this.formBuilder.group({
      universityId: ['', Validators.required],
      collegeId: [''],
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      examId: ['', Validators.required],        
    });

    this.route.queryParams
    .subscribe(params => {
        if (!this.isEmptyObject(params)){
            this.pageParams.universityId = +params.universityId;
            if (params.collegeId === undefined || isNaN(Number(params.collegeId))) {
              this.pageParams.collegeId = null;
            } else {
              this.pageParams.collegeId = +params.collegeId;
            }
            this.pageParams.examId = +params.examId;
            this.pageParams.academicYearId = +params.academicYearId;
            this.pageParams.courseId = +params.courseId;
            this.pageParams.check = +params.check;
            this.check = +params.check;
          //  this.getExamFeestructures(this.pageParams.examId);
        }
    });
    // this.getExams()
      // this.getUniversity();
      this.getFiltersList();
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  clear($event: MatRadioChange){
    if ($event.value === 2) {
       this.check = 2;
       this.colleges = [];
       this.examsList = [];
       this.courses = [];
       this.academicYears = [];
       this.examDuplicateList = [];
       this.flag = false;
       this.dataSource = new MatTableDataSource<any>([]);
       this.staffForm.get('universityId').setValue('');
       this.staffForm.get('courseId').setValue('');
       this.staffForm.get('academicYearId').setValue('');
       this.staffForm.get('examId').setValue('');
       this.staffForm.get('collegeId').setValue('');       
    }
    else{
       this.check = 1;
       this.colleges = [];
       this.examsList = [];
       this.courses = [];
       this.academicYears = [];
       this.examDuplicateList = [];
       this.flag = false;
       this.dataSource = new MatTableDataSource<any>([]);
       this.staffForm.get('universityId').setValue('');
       this.staffForm.get('courseId').setValue('');
       this.staffForm.get('academicYearId').setValue('');
       this.staffForm.get('examId').setValue('');
       this.staffForm.get('collegeId').setValue('');
    }
    
}
 /*---------- GET UNIVERSITIES ----------*/
 getUniversity(): void {
  this.crudService.listDetailsById(this.universitiesUrl, 'true', this.isActive)
    .subscribe(result => {
      if (result.statusCode === 200) {
        if (result.data.resultList && result.data.resultList !== '') {
          this.universities = result.data.resultList;
          if (!this.isEmptyObject(this.pageParams) && this.universities.length > 0){
            this.staffForm.get('universityId').setValue(+this.pageParams.universityId);
            this.selectedUniversity(+this.pageParams.universityId);
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
getFiltersList(): void {
  this.spinner.show();
 
  let request = [
    { paramName: 'in_flag', paramValue: 'univ_exam_filters' },
    { paramName: 'in_flag_type', paramValue: 'ALL' },
    { paramName: 'in_university_id', paramValue: 0 },
    { paramName: 'in_college_id', paramValue: 0 },
    { paramName: 'in_course_id', paramValue: 0 },
    { paramName: 'in_course_group_id', paramValue: 0 },
    { paramName: 'in_course_year_id', paramValue: 0 },
    { paramName: 'in_exam_id', paramValue: 0 },
    { paramName: 'in_academic_year_id', paramValue: 0 },
    { paramName: 'in_regulation_id', paramValue: 0 },
    { paramName: 'in_subject_id', paramValue: 0 },
    { paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId') },
    { paramName: 'in_loginuser_roleid', paramValue: 0 },
    { paramName: 'in_sub_flag_type', paramValue: 0 },
    { paramName: 'in_param1', paramValue: 0 },
    { paramName: 'in_param2', paramValue: 0 },
  ];
  this.crudService.getDetailsByRequest(this.getExamFiltersBycodeUrl, '', request, '&')
    .subscribe(result => {
      this.spinner.hide();
      if (result.statusCode === 200) {
        if (result.data && result.data !== '' && result.data.result.length > 0) {
          this.filtersDetailsList = result.data.result;
          for (let i = 0; i < this.filtersDetailsList.length; i++) {
            if (this.filtersDetailsList[i].length > 0 && this.filtersDetailsList[i][0].flag === 'univ_exam_filters') {
              this.CollegesListDetails = this.filtersDetailsList[i];
            }
          }
          const universityList = this.CollegesListDetails.map(({ fk_university_id }) => fk_university_id);
          this.universities = this.CollegesListDetails.filter(({ fk_university_id }, index) =>
          !universityList.includes(fk_university_id, index + 1));
          if (!this.isEmptyObject(this.pageParams) && this.universities.length > 0){
            this.staffForm.get('universityId').setValue(+this.pageParams.universityId);
            this.selectedUniversity(+this.pageParams.universityId);
        }
         else if(this.universities && this.universities.length > 0){
              this.staffForm.get('universityId').setValue(this.universities[0].fk_university_id);
              this.selectedUniversity(this.staffForm.value.universityId);
          }
        }
        else {
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

  selectedUniversity(universityId): void{
    this.courses = [];
    this.examsList = [];
    this.academicYears = [];
    this.exams = [];
    this.examDuplicateList = [];
    this.coursesList=[]
    this.colleges = [];
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('academicYearId').setValue('');
    this.staffForm.get('collegeId').setValue('');
    this.staffForm.get('courseId').setValue('');
    if (universityId !== null && universityId !== ''){
      this.coursesList=this.CollegesListDetails.filter(x=>(x.fk_university_id==this.staffForm.value.universityId))
          const courseList = this.CollegesListDetails.map(({ fk_course_id }) => fk_course_id);
          this.courses = this.CollegesListDetails.filter(({ fk_course_id }, index) =>
            !courseList.includes(fk_course_id, index + 1));
        }
        if (!this.isEmptyObject(this.pageParams) && this.courses.length > 0){
          if (this.courses.filter(x => (x.fk_course_id === this.pageParams.courseId)).length > 0){
            this.staffForm.get('courseId').setValue(+this.pageParams.courseId);
            this.selectedCourse(this.staffForm.value.courseId);  
          }
        }
       else if (this.courses.length > 0) {
          this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
          this.selectedCourse(this.staffForm.value.courseId);
        }
     }
  
  selectedCourse(courseId): void{
    this.examsList = [];
    this.academicYears = [];
    this.exams = [];
    this.examDuplicateList = [];
    this.academicYearsList =[]
    this.colleges = [];
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('academicYearId').setValue('');
    this.staffForm.get('collegeId').setValue('');
    this.dataSource = new MatTableDataSource<any>(this.examsList);
  if (courseId !== null && courseId !== ''){
    this.academicYearsList = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId))
    if (this.academicYearsList.length > 0) {
      const academicYearsList = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
      this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYearsList.includes(fk_academic_year_id, index + 1));
      // this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
    }
    if (!this.isEmptyObject(this.pageParams) && this.academicYears.length > 0){
      if (this.academicYears.filter(x => (x.fk_academic_year_id === +this.pageParams.academicYearId)).length > 0){
        this.staffForm.get('academicYearId').setValue(+this.pageParams.academicYearId);
        this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
        this.selectedAcademicYear(this.staffForm.value.academicYearId);  
      }
    }
    else if (this.academicYears.length > 0) {
      const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
        if (currentAY?.fk_academic_year_id) {
        this.staffForm.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
        }
      this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
      // this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
      this.selectedAcademicYear(this.staffForm.value.academicYearId)
    }
  }
  }
  selectedAcademicYear(academicYearId): void{
    this.staffForm.get('examId').setValue('');
    this.staffForm.get('collegeId').setValue('');
    this.exams = [];
    this.examsList = [];
    this.examDuplicateList =[];
    this.colleges = [];
    this.examsLists =[]
    this.examData = [];
    this.dataSource = new MatTableDataSource<any>(this.examsList);
    if (academicYearId !== null && academicYearId !== ''){
        /*----------- EXAMS -----------*/
        this.examsLists = this.CollegesListDetails.filter(x => (x.fk_course_id == this.staffForm.value.courseId && x.fk_academic_year_id == this.staffForm.value.academicYearId))
        if (this.examsLists.length > 0) {
          const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
          this.exams= this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
          // this.examsList = this.examsList.filter(x => !x.is_internal_exam)
          this.examDuplicateList = this.exams;
        }
        if (!this.isEmptyObject(this.pageParams)){
                  if (this.exams.filter(x => (x.fk_exam_id === this.pageParams.examId)).length > 0){
                    this.staffForm.get('examId').setValue(+this.pageParams.examId); 
                    this.selectedExam(+this.pageParams.universityId)
                  }
                } 
       else if (this.exams.length > 0) {
          this.staffForm.get('examId').setValue(this.exams[0].fk_exam_id);
          this.selectedExam(this.staffForm.value.universityId)
        }
       }
}
selectedExam(universityId){
  this.colleges = [];
  this.examsList = [];
  this.dataSource = new MatTableDataSource([]);  
  this.dataSource.paginator = this.paginator;
  this.dataSource.sort = this.sort;
  this.staffForm.get('collegeId').setValue('');
  this.ClgfiltersDetailsList = []
  this.CollegesFiltersListDetails = [];
  if (universityId !== null && universityId !== ''){
    if(this.check === 1){
      this.getExamFeestructures(this.staffForm.value.examId);
    }else{

      let request = [
        { paramName: 'in_viewname', paramValue: 'v_get_collegewise_course_details' },
        { paramName: 'in_select', paramValue: 'fk_college_id,college_code,college_name' },
        { paramName: 'in_whereclause', paramValue: 'and fk_course_id = ' + this.staffForm.value.courseId},
      ];
      this.crudService.getDetailsByRequest(this.getViewDataUrl, '', request, '&')
        .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.colleges = result.data.result[0];
                  if (!this.isEmptyObject(this.pageParams) && this.colleges.length > 0){
                       if(this.colleges.filter(x => (x.fk_college_id === +this.pageParams.collegeId )).length === 0){
                        this.staffForm.get('collegeId').setValue(null);
                        this.getExamFeestructures(this.staffForm.value.examId);
                       }else if(this.pageParams.collegeId){
                                      this.staffForm.get('collegeId').setValue(+this.pageParams.collegeId);
                                      this.getExamFeestructures(this.staffForm.value.examId);
                                    }
                               }
    }
       else {
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
     
   }
}
searchExam(value) {
  this.examDuplicateList = []
  this.searchExamList(value);
}
searchExamList(value: string) {
  let filter = value.toLowerCase();
  for (let i = 0; i < this.exams.length; i++) {
    let option = this.exams[i];
    if (option.examName.toLowerCase().indexOf(filter) >= 0) {
      this.examDuplicateList.push(option);
    }
  }
}
  getExamFeestructures(examId): void{
    this.examsList = [];
    this.dataSource = new MatTableDataSource([]);  
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    if (this.exams.filter(x => (x.fk_exam_id === this.staffForm.value.examId)).length > 0){
      this.academicYear = this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0]?.academic_year;
      this.examName = this.exams.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.exam_name;
      this.courseName = this.exams.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.course_code;
      this.fromDate = this.exams.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.from_date;
      this.toDate = this.exams.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.to_date;
      this.isInternalExam = this.exams.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_internal_exam;
      this.isRegularExam = this.exams.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_regular_exam;
      this.isSupplyExam = this.exams.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0]?.is_supply_exam;
      this.collegeName = this.colleges.filter(x => (x.fk_college_id === this.staffForm.value.collegeId))[0]?.college_code;
      this.universityCode = this.universities.filter(x => (x.fk_university_id === this.staffForm.value.universityId))[0]?.university_code;
   }
    if (this.staffForm.valid){
      if(this.check === 1){
        this.spinner.show();
        /*----------- EXAM FEE STRUCTURES -----------*/
        if (examId != null && examId !== ''){
         this.crudService.listDetailsByTwoIds(this.examFeeStructureCrudUrl, this.staffForm.value.examId, 'true', 
         'examMaster.examId', this.isActive)
         .subscribe(result => {
            this.spinner.hide();
            this.flag = true;
            if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.examsList = result.data.resultList;  
                         this.dataSource = new MatTableDataSource(this.examsList);  
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
      }else{
        this.spinner.show();
        /*----------- EXAM FEE STRUCTURES -----------*/
        if (examId != null && examId !== ''){
         this.crudService.listDetailsByThreeIds(this.examFeeStructureCrudUrl, this.staffForm.value.collegeId, this.staffForm.value.examId, 'true', 
         this.getDetailsByCollegeIdUrl, 'examMaster.examId', this.isActive)
         .subscribe(result => {
            this.spinner.hide();
            this.flag = true;
            if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.examsList = result.data.resultList;  
                         this.dataSource = new MatTableDataSource(this.examsList);  
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
     }
  }
  addExamFeestructure(): void{
     if(this.check === 1){
      this.router.navigate(['admin-examination-management/admin-exam-masters/exam-fee-setup/add-exam-fee-structure'], 
        { queryParams: { 
                         check:this.check,
                         universityId: this.staffForm.value.universityId,
                         collegeId: null,
                         examName: this.examName,
                         universityCode:this.universityCode,
                         courseName: this.courseName, 
                         fromDate: this.fromDate, 
                         academicYear: this.academicYear, 
                         toDate: this.toDate, 
                         examId: this.staffForm.value.examId,
                         courseId: this.staffForm.value.courseId,
                         academicYearId: this.staffForm.value.academicYearId,
                       } 
        });
     }else{
      this.router.navigate(['admin-examination-management/admin-exam-masters/exam-fee-setup/add-exam-fee-structure'], 
        { queryParams: { 
                         check:this.check,
                         universityId: this.staffForm.value.universityId,
                         collegeId: this.staffForm.value.collegeId,
                         collegeName: this.collegeName, 
                         universityCode:this.universityCode,
                         examName: this.examName, 
                         courseName: this.courseName, 
                         fromDate: this.fromDate, 
                         academicYear: this.academicYear, 
                         toDate: this.toDate, 
                         examId: this.staffForm.value.examId ,
                         courseId: this.staffForm.value.courseId,
                         academicYearId: this.staffForm.value.academicYearId,
                       } 
        });
     }
  }
  editExamFeestructure(data): void{
  
    if (this.exams.filter(x => (x.fk_exam_id === this.staffForm.value.examId)).length > 0){     
      this.courseId = this.exams.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0].fk_course_id;
    } 
    if(this.check === 1){
      this.router.navigate(['admin-examination-management/admin-exam-masters/exam-fee-setup/add-exam-fee-structure'], 
        { queryParams: {
                         check:this.check,
                         universityId: this.staffForm.value.universityId,
                         examFeeStructureId: data.examFeeStructureId,
                         collegeId: null,
                         examName: this.examName,
                         universityCode:this.universityCode,
                         courseName: this.courseName,
                         fromDate: this.fromDate,
                         toDate: this.toDate,
                         courseId: this.staffForm.value.courseId,
                         examId: this.staffForm.value.examId,
                         academicYearId: this.staffForm.value.academicYearId,
                         academicYear: this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year
                       } 
        });
    }else{
      this.router.navigate(['admin-examination-management/admin-exam-masters/exam-fee-setup/add-exam-fee-structure'], 
        { queryParams: {
                         check:this.check,
                         universityId: this.staffForm.value.universityId,
                         examFeeStructureId: data.examFeeStructureId, 
                         collegeId: this.staffForm.value.collegeId,
                         collegeName: this.collegeName, 
                         universityCode:this.universityCode,
                         examName: this.examName,
                         courseName: this.courseName, 
                         fromDate: this.fromDate, 
                         toDate: this.toDate, 
                         courseId: this.staffForm.value.courseId,
                         examId: this.staffForm.value.examId ,
                         academicYearId: this.staffForm.value.academicYearId,
                         academicYear: this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year
                       } 
        });
    }
  }
  viewExamFeeStructure(data): void{
    data.examYear = this.academicYears.filter(x => x.fk_academic_year_id === this.staffForm.value.academicYearId)[0].academic_year;
    data.courseCode = this.courses.filter(x => x.fk_course_id === this.staffForm.value.courseId)[0].course_code;
    const dialogRef = this.dialog.open(ViewExamFeeStructureComponent, {
        width: '700px',
        data: data
    });
  }
}