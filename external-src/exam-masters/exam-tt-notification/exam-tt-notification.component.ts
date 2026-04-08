import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder,FormControl,Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { Router, ActivatedRoute } from '@angular/router';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { LocalStorage } from '@ngx-pwa/local-storage';

@Component({
  selector: 'app-exam-tt-notification',
  templateUrl: './exam-tt-notification.component.html',
  styleUrls: ['./exam-tt-notification.component.scss']
})
export class ExamTtNotificationComponent implements OnInit {

 
  displayedColumns: string[] = ['id', 'groupCode', 'regulationCode', 'subjectCode',  'examTypeCatCode', 'examDate', 'examSessionName', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  panelOpenState = true;

  public dateFormate = CONSTANTS.dateFormate;
  private collegewisedetailsUrl=CONSTANTS.collegewisedetailsUrl;
  private examNotificationDetailsUrl = CONSTANTS.examNotificationDetailsUrl
  public ExamMasterFilterCtrl: FormControl = new FormControl();
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private isActive  = CONSTANTS.isActive;
  MINIO = CONSTANTS.MINIO
  
  staffForm: FormGroup;
  colleges: College[] = [];
  courses: Course[] = [];
  step = 0;  
  examTimetableList: any[] = [];
  pageParams: any = {};
  examFeeTypes: GeneralDetail[] = [];
  courseYears: any[] = [];
  examsList: any[] = [];
  examTimetble: any[] = [];
  academicYears: any[] = [];
  courseGroups: any[] = [];
  duplicateCourseGroups: any[] = [];
  dateArray = [];
  arr = [];
  collegeCode;
  courseCode;
  examYear;
  courseYear;
  academicYear;
  examDetails: any = {};
  data;
  dataSecStaff;
  dataSECPrincipal;
  days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  examMasters: any[];
  filtersDetailsList: any[];
  CollegesListDetails: any[];
  courseListData: any[];
  academicYearsList: any[];
  examsLists: any[];
  examData: any[];
  courseYearsList: any[];
  groupDetails: any[];
  ExamsDetailsList: any;
  examDateList: any;
  courseGrpList: any;
  flag=false;
  collegesLogoList: any[];
  Logo: any[];
  collegeName: any;
  collegeAddress: any;

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService, private crudService: CrudService, private spinner: NgxSpinnerService, 
              private router: Router, private dialog: MatDialog,
              private route: ActivatedRoute, private genericFunctions: GenericFunctions, private storage: LocalStorage) {         
      
  }

  ngOnInit() {  
      
    this.dataSource = new MatTableDataSource(this.examTimetableList);  
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.staffForm = this.formBuilder.group({
        collegeId: ['', Validators.required],
        courseId: ['', Validators.required],  
        courseYearId: ['', Validators.required],
        academicYearId: ['', Validators.required], 
       // examTypeId: [''],
        examId: ['', Validators.required],
    });

    this.dataSecStaff = this.genericFunctions.dataSecurityLevel();
    this.dataSECPrincipal = this.genericFunctions.dataSecurityLevelPrincipal();
    this.getFiltersList();
  }
  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }
  getFiltersList(): void {
      this.filtersDetailsList =[]
      this.CollegesListDetails=[]
      this.groupDetails=[]
      this.colleges=[]
      this.spinner.show()
      let request = [
        {paramName: 'in_flag', paramValue: 'clg_exam_filters'},
        {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
        {paramName: 'in_college_id', paramValue: 0},
        {paramName: 'in_course_id', paramValue: 0},
        {paramName: 'in_course_group_id', paramValue: 0},
        {paramName: 'in_course_year_id', paramValue: 0},
        {paramName: 'in_group_section_id', paramValue: 0},
        {paramName: 'in_academic_year_id', paramValue: 0},
        {paramName: 'in_dept_id', paramValue: 0},
         {paramName: 'in_isadmin', paramValue: 0},
          {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
           {paramName: 'in_loginuser_roleid', paramValue: 0},
           {paramName: 'in_employee', paramValue: ''},
           {paramName: 'in_subject', paramValue: ''},
           {paramName: 'in_gm_codes', paramValue:'QUOTA,GENDER'},
          
           
      ];
      this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
    .subscribe(result =>  {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.filtersDetailsList = result.data.result;
                for(let i=0; i<this.filtersDetailsList.length; i++){
                  if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'clg_exam_filters'){
                    this.CollegesListDetails  = this.filtersDetailsList[i];
                    }
                   else if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'group_details'){
                      this.groupDetails= this.filtersDetailsList[i]
                    }
                  
            }
            const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
            this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) => !CollegeIdData.includes(fk_college_id, index + 1));
            if (!this.isEmptyObject(this.pageParams) && this.colleges.length > 0){
              this.staffForm.get('collegeId').setValue(+this.pageParams.collegeId);
              this.selectedCollege(this.staffForm.value.collegeId);
          }
           else if (this.colleges.length > 0){
              this.staffForm.get('collegeId').setValue(this.colleges[0].fk_college_id);
              this.data = this.colleges.filter(x => (x.fk_college_id === this.staffForm.value.collegeId))[0].college_code;
              this.selectedCollege(this.staffForm.value.collegeId); 
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


  selectedCollege(collegeId): void{
      this.collegeCode = this.colleges.filter(x => (x.fk_college_id === collegeId))[0].college_code;
      this.examTimetableList = [];
      this.dataSource = new MatTableDataSource(this.examTimetableList);  
      this.staffForm.get('courseId').setValue('');
      this.staffForm.get('courseYearId').setValue('');
      this.staffForm.get('academicYearId').setValue('')
      this.staffForm.get('examId').setValue('');
      this.staffForm.get('courseYearId').setValue('');
      this.courses = [];
      if (collegeId !== null && collegeId !== ''){

          /*----------- COURSES -----------*/
          // this.crudService.listDetailsByTwoIds(this.courseCrudUrl, collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
          // .subscribe(result => {
          //     if (result.statusCode === 200){
          //             if (result.data.resultList && result.data.resultList !== '') {
          //                 this.courses = result.data.resultList;
          //                 if (this.dataSecStaff && this.courses.length > 0){
          //                     this.staffForm.get('courseId').setValue(+localStorage.getItem('courseId'));
          //                     this.data =  this.data + ' / ' + this.courses.filter(x => (x.courseId === this.staffForm.value.courseId))[0].courseCode;
          //                     // this.selectedCourse(this.staffForm.value.courseId); 
          //                  }
          //                  else    
          //                 if (!this.isEmptyObject(this.pageParams) && this.courses.length > 0){
          //                     this.staffForm.get('courseId').setValue(+this.pageParams.courseId);
          //                      this.selectedCourse(this.pageParams.courseId);
                                          
          //              }           
          //             } else {
          //                 this.snotifyService.success(result.message, 'Success!');
          //             }
          //         }else {
          //           this.snotifyService.error(result.message, 'Error!');
          //       }
              
          // }, error => {
          //   if (error.error.statusCode === 401){
          //       this.snotifyService.error(error.error.message, 'Error!');
          //       this.genericFunctions.logOut(this.router.url);
          //   }else{
          //       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          //   }
          // });
          this.courseListData=[]
          this.courseListData=this.CollegesListDetails.filter(x=>(x.fk_college_id==collegeId))
                  if(this.courseListData.length>0){
                      const courseList = this.courseListData.map(({ fk_course_id }) => fk_course_id);
                      this.courses = this.courseListData.filter(({ fk_course_id }, index) =>
                      !courseList.includes(fk_course_id, index + 1));
                  }
                  if (!this.isEmptyObject(this.pageParams) && this.courses.length > 0){
                           this.staffForm.get('courseId').setValue(+this.pageParams.courseId);
                          this.selectedCourse(this.pageParams.courseId);
                                                      
                                   }           
                else if (this.courses.length > 0){
                    this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
                    this.data =  this.data + ' / ' + this.courses.filter(x => (x.fk_course_id === this.staffForm.value.courseId))[0].course_code;
                    this.selectedCourse(this.staffForm.value.courseId); 
                 } 
       
      }
  }

  selectedCourse(courseId): void{
      if (courseId != null){
          this.courseCode = this.courses.filter(x => (x.fk_course_id === courseId))[0].course_code;
          this.examTimetableList = [];
          this.dataSource = new MatTableDataSource(this.examTimetableList);  
          this.staffForm.get('courseYearId').setValue('');
          this.staffForm.get('academicYearId').setValue('')
          this.staffForm.get('examId').setValue('');
      this.staffForm.get('courseYearId').setValue('');
          this.courseYears = [];
             this.academicYearsList=[]
             this.academicYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id==this.staffForm.value.collegeId && x.fk_course_id==this.staffForm.value.courseId))
                   if(this.academicYearsList.length>0){
                   const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
                   this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
                   }
                   if (!this.isEmptyObject(this.pageParams) && this.academicYears.length > 0){
                      this.staffForm.get('academicYearId').setValue(+this.pageParams.academicYearId);
                      this.selectedAcademicYear(this.pageParams.academicYearId);
                     }  
           else if(this.academicYears.length>0){
             this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
             this.data =  this.data + ' / ' + this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year;
             this.selectedAcademicYear( this.staffForm.value.academicYearId)
           }		 

               /*----------- ACADEMIC YEARS -----------*/
        //  this.crudService.listDetailsByTwoIds(this.academicYearCrudUrl, this.staffForm.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
          // tslint:disable-next-line: max-line-length
          // this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl,  this.staffForm.value.collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
          // .subscribe(result => {
          //     if (result.statusCode === 200){
          //             if (result.data.resultList && result.data.resultList !== '') {
          //                 this.academicYears = result.data.resultList;
          //                 if (this.dataSecStaff && this.academicYears.length > 0){
          //                     this.staffForm.get('academicYearId').setValue(+localStorage.getItem('academicYearId'));
          //                     this.data =  this.data + ' / ' + this.academicYears.filter(x => (x.academicYearId === this.staffForm.value.academicYearId))[0].academicYear;
          //                     this.selectedAcademicYear(this.staffForm.value.academicYearId); 
          //                  }
          //             } else {
          //                 this.snotifyService.success(result.message, 'Success!');
          //             }
          //         }else {
          //             this.snotifyService.error(result.message, 'Error!');
          //         }
              
          // }, error => {
          //     if (error.error.statusCode === 401){
          //         this.snotifyService.error(error.error.message, 'Error!');
          //         this.genericFunctions.logOut(this.router.url);
          //     }else{
          //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          //     }
          // });
          //       /*----------- COURSE GROUPS -----------*/
          // this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
          //         .subscribe(result => {
          //             if (result.statusCode === 200) {
          //                 if (result.data.resultList && result.data.resultList !== '') {
          //                  //   this.courseGroups = result.data.resultList;
          //                     this.duplicateCourseGroups = result.data.resultList;
                              

          //                 } else {
          //                     this.snotifyService.success(result.message, 'Success!');
          //                 }
          //             }else {
          //             this.snotifyService.error(result.message, 'Error!');
          //         }
          //         }, error => {
          //         if (error.error.statusCode === 401){
          //             this.snotifyService.error(error.error.message, 'Error!');
          //             this.genericFunctions.logOut(this.router.url);
          //         }else{
          //             this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          //         }
          //         });

          //        /*----------- COURSE YEARS -----------*/
          // this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, courseId, 'true', 'ASC',
          //         this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
          //        .subscribe(result => {
          //            if (result.statusCode === 200){
          //                    if (result.data.resultList && result.data.resultList !== '') {
          //                     //    this.courseYears = result.data.resultList;
          //                        if (!this.isEmptyObject(this.pageParams) && this.academicYears.length > 0){
          //                         this.staffForm.get('academicYearId').setValue(+this.pageParams.academicYearId);
          //                         this.selectedAcademicYear(this.pageParams.academicYearId);
          //                        }  
          //                    } else {
          //                        this.snotifyService.success(result.message, 'Success!');
          //                    }
          //                }else {
          //                  this.snotifyService.error(result.message, 'Error!');
          //              }
                     
          //        }, error => {
          //          if (error.error.statusCode === 401){
          //              this.snotifyService.error(error.error.message, 'Error!');
          //              this.genericFunctions.logOut(this.router.url);
          //          }else{
          //              this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          //          }
          //        });
      }
  }

  selectedAcademicYear(academicYearId): void{
      this.academicYear =  this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year;
      this.examsList = [];
      this.staffForm.get('examId').setValue('');
      this.staffForm.get('courseYearId').setValue('');
      if (academicYearId){
          this.examsLists=[]
          this.examData = []
          this.examsLists=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.staffForm.value.collegeId && x.fk_course_id==this.staffForm.value.courseId && x.fk_academic_year_id==academicYearId))
        if(this.examsLists.length>0){
        const examsLists = this.examsLists.map(({ fk_exam_id }) => fk_exam_id);
        this.examsList = this.examsLists.filter(({ fk_exam_id }, index) => !examsLists.includes(fk_exam_id, index + 1));
        this.examData = this.examsList;
        }
        if (!this.isEmptyObject(this.pageParams) && this.examsList.length > 0){
          this.staffForm.get('examId').setValue(+this.pageParams.examId);
          // this.staffForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
          // this.selectedCourseYear();
          this.selectedExam();
   } 
       else if(this.examsList.length>0){
          this.staffForm.get('examId').setValue(this.examsList[0].fk_exam_id);
          this.selectedExam()
        }
          // this.crudService.listDetailsByFourIds(this.examMasterUrl, this.staffForm.value.collegeId, this.staffForm.value.courseId, academicYearId, 'true',
          //     this.getDetailsByCollegeIdUrl, this.getDetailsByCourseIdUrl, 'AcademicYear.academicYearId', this.isActive)
              // tslint:disable-next-line: max-line-length
          //     this.crudService.listDetailsByFourIdsWithSortOrder(this.examMasterUrl, this.staffForm.value.collegeId, this.staffForm.value.courseId, academicYearId, 'true', 
          // 'DESC', this.getDetailsByCollegeIdUrl, this.getDetailsByCourseIdUrl, this.getDetailsByAcademicYearIdUrl, this.isActive , 'createdDt')
          // .subscribe(result => {
          //    this.spinner.hide();
          //    if (result.statusCode === 200){
          //         if (result.success) {
          //             this.examsList = result.data.resultList;
          //             this.examMasters = this.examsList;
          //             if (!this.isEmptyObject(this.pageParams) && this.examsList.length > 0){
          //                 this.staffForm.get('examId').setValue(+this.pageParams.examId);
          //                 // this.staffForm.get('courseYearId').setValue(+this.pageParams.courseYearId);
          //                 // this.selectedCourseYear();
          //                 this.selectedExam();
          //          } 
                 
          //         }else{
          //           this.snotifyService.success(result.message, 'Success!');
          //         }
          //    }else {
          //     this.snotifyService.error(result.message, 'Error!');
          // }
          // }, error => {
          //     this.spinner.hide();
          //     if (error.error.statusCode === 401){
          //         this.snotifyService.error(error.error.message, 'Error!');
          //         this.genericFunctions.logOut(this.router.url);
          //    }else{
          //        this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
          //    }
          // });
      }
  }

  searchexam(value){
      this.examData = [];
      this.search(value)
  }

  search(value: string) { 
      let filter = value.toLowerCase();
      for ( let i = 0 ; i < this.examsList.length; i++ ) {
          let option = this.examsList[i];
          if (option.exam_name.toLowerCase().indexOf(filter) >= 0) {
              this.examData.push(option);
          }
      }
    }

  selectedExam(): void{
      this.examTimetableList = [];  
      this.examDetails =  this.examsList.filter(x => (x.fk_exam_id === this.staffForm.value.examId))[0];
      this.staffForm.get('courseYearId').setValue('');

      this.courseYearsList=[]
      /*----------- COURSES Years -----------*/      
      this.courseYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.staffForm.value.collegeId && x.fk_course_id==this.staffForm.value.courseId && x.fk_academic_year_id==this.staffForm.value.academicYearId && x.fk_exam_id==this.staffForm.value.examId))
         if(this.courseYearsList.length>0){
         const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
         this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
         }
         if (this.courseYears.length > 0){
          this.staffForm.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
          this.selectedCourseYear();
   } 
  }
  selectedCourseYear(){
    this.getDetails();
  }
getDetails(){
  this.getCollegeLogo();
  this.flag=true
  this.ExamsDetailsList =[]
      this.spinner.show()
      let request = [
        {paramName: 'in_flag', paramValue: 'exam_tt_notification'},
        {paramName: 'in_org_id', paramValue:+localStorage.getItem('organizationId')},
        {paramName: 'in_exam_id', paramValue: this.staffForm.value.examId},
        {paramName: 'in_academicYearId', paramValue: this.staffForm.value.academicYearId},
        {paramName: 'in_course_groupId', paramValue: 0},
        {paramName: 'in_course_yearId', paramValue: this.staffForm.value.courseYearId},
          {paramName: 'in_loginuser_empid', paramValue: +localStorage.getItem('employeeId')},
        {paramName: 'in_exam_sessionid', paramValue: 0},

          
           
      ];
      this.crudService.getDetailsByRequest(this.examNotificationDetailsUrl, '', request, '&')
    .subscribe(result =>  {
            this.spinner.hide();
            if (result.statusCode === 200) {
              if (result.data && result.data !== '' && result.data.result.length > 0) {
                this.ExamsDetailsList = result.data.result[0];
                if(this.ExamsDetailsList.length>0){
                  const examDateList = this.ExamsDetailsList.map(({ exam_date }) => exam_date);
                  this.examDateList = this.ExamsDetailsList.filter(({ exam_date }, index) =>
                  !examDateList.includes(exam_date, index + 1));
                  
              }
              if(this.ExamsDetailsList.length>0){
                const courseGrpList = this.ExamsDetailsList.map(({ group_code }) => group_code);
                this.courseGrpList = this.ExamsDetailsList.filter(({ group_code }, index) =>
                !courseGrpList.includes(group_code, index + 1));
                
            }
            for (let index = 0; index < this.examDateList.length; index++) {
              this.examDateList[index].groups=[]
              for (let i = 0; i < this.ExamsDetailsList.length; i++) {
                if(this.examDateList[index].exam_date==this.ExamsDetailsList[i].exam_date){
                  this.examDateList[index].groups.push(this.ExamsDetailsList[i])
                }
               
                
              }
            
            }
            
            //     for(let i=0; i<this.filtersDetailsList.length; i++){
            //       if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'clg_exam_filters'){
            //         this.CollegesListDetails  = this.filtersDetailsList[i];
            //         }
            //        else if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'group_details'){
            //           this.groupDetails= this.filtersDetailsList[i]
            //         }
                  
            // }
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
getCollegeLogo(): void{
  this.collegesLogoList = [];
  this.Logo = [];
  /*----------- COLLEGES -----------*/
  this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
       .subscribe(result => {
           if (result.statusCode === 200){
                   if (result.data.resultList && result.data.resultList !== '') {
                       this.collegesLogoList = result.data.resultList;    
                      //  for(let i=0; i<this.colleges.length; i++){
                        this.Logo = this.collegesLogoList.filter(x=> (x.collegeId == this.staffForm.value.collegeId))[0].logo
                        this.collegeName = this.collegesLogoList.filter(x=> (x.collegeId == this.staffForm.value.collegeId))[0].collegeName
                        this.collegeAddress = this.collegesLogoList.filter(x=> (x.collegeId == this.staffForm.value.collegeId))[0].address
                      //  }    
                                    
                   } else {
                       this.snotifyService.success(result.message, 'Success!');
                   }
               }else{
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


  // tslint:disable-next-line:typedef
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
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
  addNotification(){
    this.router.navigate(['admin-examination-management/admin-exam-masters/exam-timetable-notification/send-tt-notification'], { queryParams: { collegeId: this.staffForm.value.collegeId,
      academicYearId: this.staffForm.value.academicYearId} });
  }
  
  print(){
    window.print()
  }

}
