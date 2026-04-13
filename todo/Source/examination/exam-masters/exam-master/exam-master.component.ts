import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { College } from 'app/main/models/college';
import { Course } from 'app/main/models/course';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatRadioChange } from '@angular/material/radio';
import { ExamMasterModalComponent } from './exam-master-modal/exam-master-modal.component';
import { ParametersService } from 'app/main/services/parameters.service';

@Component({
  selector: 'app-exam-master',
  templateUrl: './exam-master.component.html',
  styleUrls: ['./exam-master.component.scss']
})

export class ExamMasterComponent implements OnInit {

    // tslint:disable-next-line:max-line-length
    displayedColumns: string[] = ['id', 'examName', 'examShortName', 'examType', 'examMonthYr', 'fromDate', 'toDate', 'feeNotificationFilePath', 'notificationFilePath', 'examMasterDetails', 'isActive', 'actions'];
    dataSource: MatTableDataSource<any>;
  
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    panelOpenState = true;
  
    private universitiesUrl = CONSTANTS.universitiesUrl;
    private getDetailsByUniversityIdUrl = CONSTANTS.getDetailsByUniversityIdUrl;
    private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
    private courseCrudUrl = CONSTANTS.courseCrudUrl;
    private examMasterUrl = CONSTANTS.examMasterUrl;
    private examIdUrl = CONSTANTS.examIdUrl;
    private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;   
    private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
    private examNotificationUploadUrl = CONSTANTS.examNotificationUploadUrl;
    private isActive = CONSTANTS.isActive;
    private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
    private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
    private collegeWiseDetails = CONSTANTS.collegeWiseDetailsUrl;
  
    staffForm: FormGroup;
    universities = [];
    colleges: College[] = [];
    academicYears: any[] = [];
    courses: Course[] = [];
    step = 0;  
    examsList: any[] = [];
    exam: any = {};
    public formData;
    file = false;
    check = 1;
    flag :boolean = false;
    filtersDetailsList = [];
    filtersdata = [];
    academicData=[]
    courseData=[];
    academicYearData=[];
    collegesData=[]
    constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
                private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
                private dialog: MatDialog, private genericFunctions: GenericFunctions,public parameterService: ParametersService) {        
        // this.selectedCollege();
                    // this.getUniversity();
                    this.getfilterDetails();
    }
  
    // tslint:disable-next-line:typedef
    ngOnInit() {       
        this.staffForm = this.formBuilder.group({
          universityId: ['', Validators.required],
          collegeId: [],
          academicYearId: ['', Validators.required],
          courseId: ['', Validators.required],        
        }); 
        this.dataSource = new MatTableDataSource<any>(this.examsList);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }
    clear($event: MatRadioChange){
        if ($event.value === 2) {
           this.check=2;
           this.colleges = [];
           this.examsList = [];
           this.courses = [];
           this.academicYears = [];
           this.flag = false;
           this.dataSource = new MatTableDataSource<any>([]);
           this.staffForm.get('universityId').setValue('');
           this.staffForm.get('collegeId').setValue('');
           this.staffForm.get('courseId').setValue('');
           this.staffForm.get('academicYearId').setValue('');
           if(this.universities && this.universities.length > 0){
            this.staffForm.get('universityId').setValue(this.universities[0].fk_university_id);
            this.selectedUniversity(this.staffForm.value.universityId);
        }
        }
        else{
           this.check=1;
           this.colleges = [];
           this.examsList = [];
           this.courses = [];
           this.academicYears = [];
           this.flag = false;
           this.dataSource = new MatTableDataSource<any>([]);
           this.staffForm.get('universityId').setValue('');
           this.staffForm.get('collegeId').setValue('');
           this.staffForm.get('courseId').setValue('');
           this.staffForm.get('academicYearId').setValue('');
           if(this.universities && this.universities.length > 0){
            this.staffForm.get('universityId').setValue(this.universities[0].fk_university_id);
            this.selectedUniversity(this.staffForm.value.universityId);
        }
        }
        
    }
    getfilterDetails(){
        this.spinner.show()
        let request = [
          {paramName: 'in_flag', paramValue: 'clg_filters'},
          {paramName: 'in_org_id', paramValue: +localStorage.getItem('organizationId')},
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
          {paramName: 'in_subject', paramValue: ''},
          {paramName: 'in_employee', paramValue: ''},
          {paramName: 'in_gm_codes', paramValue: ''},
        ];
        this.crudService.getDetailsByRequest(this.collegeWiseDetails, '', request, '&')
      .subscribe(result =>  {
          if (result.statusCode === 200) {
            this.spinner.hide()
            if (result.data && result.data !== '' && result.data.result.length > 0) {
               this.filtersDetailsList = result.data.result;
            for(let i=0; i<this.filtersDetailsList.length; i++){
                if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'clg_filters'){
                    this.filtersdata = this.filtersDetailsList[i];
                    }
                    else if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].clg_filters_ay === 'clg_filters_ay'){
                        this.academicData = this.filtersDetailsList[i];
                        }
               
            }  
            /*----------- DISTINCT COLLEGE-----------*/            
            const universityList = this.filtersdata.map(({ fk_university_id }) => fk_university_id);
            this.universities = this.filtersdata.filter(({ fk_university_id }, index) =>
            !universityList.includes(fk_university_id, index + 1));
            if(this.universities && this.universities.length > 0){
                this.staffForm.get('universityId').setValue(this.universities[0].fk_university_id);
                this.selectedUniversity(this.staffForm.value.universityId);
            }
            } else {
              this.snotifyService.success(result.message, 'Success!');
            }
          } else {
            this.spinner.hide()
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
    /*---------- GET UNVERSITIES ----------*/
    getUniversity(): void {
        this.crudService.listDetailsById(this.universitiesUrl, 'true', this.isActive)
          .subscribe(result => {
            if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '') {
                this.universities = result.data.resultList;
    
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
    selectedUniversity(universityId): void{
        this.staffForm.get('courseId').setValue('');
        this.staffForm.get('academicYearId').setValue('');
        this.staffForm.get('collegeId').setValue('');
        this.colleges = [];
        this.examsList = [];
        this.courses = [];
        this.academicYears = [];
        this.courseData =[]
        this.flag = false;
        this.dataSource = new MatTableDataSource<any>(this.examsList);
        if (universityId !== null && universityId !== ''){
            /*----------- COURSES -----------*/
            this.courseData = this.filtersdata.filter(x=>(x.fk_university_id === this.staffForm.value.universityId));
            if(this.courseData.length > 0){
            const Course_Id = this.courseData.map(({ fk_course_id }) => fk_course_id);
                    this.courses = this.courseData.filter(({ fk_course_id }, index) =>
                        !Course_Id.includes(fk_course_id, index + 1));
            }
            if(this.courses.length > 0){
                this.staffForm.get('courseId').setValue(this.courses[0].fk_course_id);
                this.selectedCourse(this.staffForm.value.courseId); 
            }

            // this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.staffForm.value.universityId, 'true', this.getDetailsByUniversityIdUrl, this.isActive)
            // .subscribe(result => {
            //     if (result.statusCode === 200){
            //             if (result.data.resultList && result.data.resultList !== '') {
            //                 this.courses = result.data.resultList; 
                                               
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
           }
    
    }

    // tslint:disable-next-line:typedef
   
    selectedCourse(courseId): void{
        this.staffForm.get('collegeId').setValue('');
        this.colleges = [];
        this.staffForm.get('academicYearId').setValue('');
        this.academicYears = [];
        this.examsList = [];
        this.flag = false;
        this.academicYearData=[]
        this.academicYears=[]
        this.collegesData=[]
        this.dataSource = new MatTableDataSource<any>(this.examsList);
             /*----------- ACADEMIC YAERS -----------*/
             if (courseId != null && courseId !== undefined ){

             this.academicYearData = this.academicData.filter(x=>(x.fk_university_id === this.staffForm.value.universityId));
             if(this.academicYearData.length>0){
               const academicYears = this.academicYearData.map(({ fk_academic_year_id }) => fk_academic_year_id);
               this.academicYears = this.academicYearData.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
              //  this.academicYears=this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
             }
             if(this.academicYears && this.academicYears.length > 0){
              const currentAY = this.academicYears?.sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))[0];
              if (currentAY?.fk_academic_year_id) {
              this.staffForm.get('academicYearId')?.setValue(currentAY.fk_academic_year_id);
              }
               this.academicYears = this.academicYears.sort((a,b)=>parseInt(b?.academic_year) - parseInt(a?.academic_year));
              //  this.staffForm.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
               this.selectedAcademicYear(this.staffForm.value.academicYearId)
             }
            //     this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, this.staffForm.value.universityId, 'true', 'DESC', this.getDetailsByUniversityIdUrl, this.isActive, 'fromDate')
            //     .subscribe(result => {
            //         if (result.statusCode === 200){
            //                 if (result.data.resultList && result.data.resultList !== '') {
            //                     this.academicYears = result.data.resultList;
            //                 } else {
            //                     this.snotifyService.success(result.message, 'Success!');
            //                 }
            //             }else {
            //                 this.snotifyService.error(result.message, 'Error!');
            //             }
                    
            //     }, error => {
            //         if (error.error.statusCode === 401){
            //             this.snotifyService.error(error.error.message, 'Error!');
            //             this.genericFunctions.logOut(this.router.url);
            //         }else{
            //             this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
            //         }
            //     });
            }
    }

    selectedAcademicYear(academicYearId): void{
        this.staffForm.get('collegeId').setValue('');
        this.colleges = [];
        this.examsList = [];
        this.flag = false;
        this.dataSource = new MatTableDataSource<any>(this.examsList);
 if (academicYearId !== null && academicYearId !== undefined && this.staffForm.value.courseId !== null && this.staffForm.value.courseId !== undefined){
      /*-----------Exams -----------*/     
    if(this.check === 1){
        this.spinner.show();       
        this.crudService.listDetailsByThreeIdsWithSort(this.examMasterUrl, this.staffForm.value.universityId, this.staffForm.value.courseId, this.staffForm.value.academicYearId,
            'DESC', this.getDetailsByUniversityIdUrl, this.getDetailsByCourseIdUrl, this.getDetailsByAcademicYearIdUrl, 'createdDt')   
          .subscribe(result => {
             this.spinner.hide();
             if (result.statusCode === 200){
                this.flag = true;
                  if (result.data.resultList && result.data.resultList.length > 0) {
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
    }else{
        this.colleges = [];
        this.collegesData=[]
        this.staffForm.get('collegeId').setValue('')
        this.collegesData=this.filtersdata.filter(x=>(x.fk_university_id === this.staffForm.value.universityId && x.fk_course_id === this.staffForm.value.courseId));
        const collegeList = this.filtersdata.map(({ fk_college_id }) => fk_college_id);
        this.colleges = this.filtersdata.filter(({ fk_college_id }, index) =>
        !collegeList.includes(fk_college_id, index + 1));
        // this.crudService.listDetailsByTwoIds(this.collegeCrudUrl, this.staffForm.value.universityId, 'true', this.getDetailsByUniversityIdUrl, this.isActive)
        //      .subscribe(result => {
        //          if (result.statusCode === 200){
        //                  if (result.data.resultList && result.data.resultList !== '') {
        //                      this.colleges = result.data.resultList;   
                                          
        //                  } else {
        //                      this.snotifyService.success(result.message, 'Success!');
        //                  }
        //              }else {
        //           this.snotifyService.error(result.message, 'Error!');
        //       }
        //      }, error => {
        //       if (error.error.statusCode === 401){
        //           this.snotifyService.error(error.error.message, 'Error!');
        //           this.genericFunctions.logOut(this.router.url);
        //       }else{
        //           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        //       }
        // });
       
    }
     }
    }
    selectedCollege(collegeId){
        this.examsList = [];
        this.dataSource = new MatTableDataSource([]);
        this.flag = false;
        this.spinner.show();          
        this.crudService.listDetailsByThreeIdsWithSort(this.examMasterUrl, this.staffForm.value.collegeId, this.staffForm.value.courseId, this.staffForm.value.academicYearId,
            'DESC', this.getDetailsByCollegeIdUrl, this.getDetailsByCourseIdUrl, this.getDetailsByAcademicYearIdUrl, 'createdDt')
          .subscribe(result => {
             this.spinner.hide();
             if (result.statusCode === 200){
                this.flag = true;
                  if (result.data.resultList && result.data.resultList.length > 0) {
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

  openDialog(): void {
    if(this.check === 2)
    this.exam.collegeCode = this.colleges.filter(x => (x.fk_college_id === this.staffForm.value.collegeId))[0].college_code;
    this.exam.universityCode = this.universities.filter(x => (x.fk_university_id === this.staffForm.value.universityId))[0].university_code;
    this.exam.academicYear = this.academicYears.filter(x => (x.fk_academic_year_id === this.staffForm.value.academicYearId))[0].academic_year;
    this.exam.courseCode = this.courses.filter(x => (x.fk_course_id === this.staffForm.value.courseId))[0].course_code;
    this.exam.dataDetails = 'newExam';
    this.file =  false;
    const dialogRef = this.dialog.open(ExamMasterModalComponent, {
      width: '750px',
      data:  this.exam
    });

    dialogRef.afterClosed().subscribe(details => {
      if (details != null && details !== ''){  
          this.spinner.show();
          details.universityId = this.staffForm.value.universityId;
          details.collegeId = this.staffForm.value.collegeId;
          details.courseId = this.staffForm.value.courseId;
          details.academicYearId = this.staffForm.value.academicYearId;
          details.examMonthYr = this.genericFunctions.momentFormatYMD1(details.examMonthYr);
          console.log(details,'details')
          /*---------- ADD Exam ----------*/
          this.crudService.addDetails(this.examMasterUrl, details)
          .subscribe(result => {
              this.spinner.hide();
              if (result.statusCode === 200){
                  if (result.data && result.data !== '' && result.success === true) {
                     
                        this.formData = new FormData();
                        if (details.notificationFile != null ){
                        this.file =  true;
                        this.formData.append('examId ', result.data.examId);
                        this.formData.append('notificationFilePath',
                        details.notificationFile.nativeElement.files[0],
                        details.notificationFile.nativeElement.files[0].name);
                      }

                        if (details.feeNotificationFile != null ){
                        this.file =  true;
                        this.formData.append('examId ', result.data.examId);
                        this.formData.append('feeNotificationFilePath',
                        details.feeNotificationFile.nativeElement.files[0],
                        details.feeNotificationFile.nativeElement.files[0].name);
                      }
                        if ( this.file ===  true){
                            this.spinner.show();
                          //  this.UplodaFile(this.formData);
                            /*-------- FILE UPLOAD ---------*/ 
                            this.crudService.upload(this.examNotificationUploadUrl, this.formData)
                            .subscribe(result1 => {
                                this.spinner.hide();
                                if (result1.statusCode === 200){
                                    if (result1.success) {
                                        this.selectedCourse(this.staffForm.value.courseId);
                                        this.snotifyService.success(result1.message, 'Success!');
                                    } else {
                                        this.selectedCourse(this.staffForm.value.courseId);
                                        this.snotifyService.info(result1.message, 'Info!');
                                    }
                                }else {
                                    this.selectedCourse(this.staffForm.value.courseId);
                                    this.snotifyService.error(result1.message, 'Error!');
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
                        }else{
                            this.selectedCourse(this.staffForm.value.courseId);
                        }
                   
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
  });
}

  /*---------- EDIT Floor -----------*/
  editDialog(data): void {
      this.exam = data;
      this.exam.dataDetails = 'ediExam';
      const dialogRef = this.dialog.open(ExamMasterModalComponent, {
      width: '750px',
      data: this.exam
      });

      dialogRef.afterClosed().subscribe(details => {
          if (details != null && details !== ''){
              details.examId = data.examId;
              this.updateExamMasters(details);
              
          }
      });
  }

    /*------------ UPDATE Floor -----------*/
    updateExamMasters(details): void{
      this.spinner.show();
      this.file = false;
      this.crudService.updateDetails(this.examMasterUrl, details, details.examId, this.examIdUrl)
      .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200){
              if (result.data && result.data !== '') {
                  this.snotifyService.success(result.message, 'Success!');
                  this.formData = new FormData();
                  if (details.notificationFile != null ){
                      this.file =  true;
                      this.formData.append('examId ', result.data.examId);
                      this.formData.append('notificationFilePath',
                  details.notificationFile.nativeElement.files[0],
                  details.notificationFile.nativeElement.files[0].name);
                }

                  if (details.feeNotificationFile != null ){
                  this.file =  true;
                  this.formData.append('examId ', result.data.examId);
                  this.formData.append('feeNotificationFilePath',
                  details.feeNotificationFile.nativeElement.files[0],
                  details.feeNotificationFile.nativeElement.files[0].name);
                }
                  if ( this.file ===  true){
                    this.spinner.show();
                    /*-------- FILE UPLOAD ---------*/ 
                    this.crudService.upload(this.examNotificationUploadUrl, this.formData)
                    .subscribe(result1 => {
                        this.spinner.hide();
                        if (result1.statusCode === 200){
                            if (result1.success) {
                                this.selectedCourse(this.staffForm.value.courseId);
                                this.snotifyService.success(result1.message, 'Success!');
                            } else {
                                this.selectedCourse(this.staffForm.value.courseId);
                                this.snotifyService.info(result1.message, 'Info!');
                            }
                        }else {
                            this.selectedCourse(this.staffForm.value.courseId);
                            this.snotifyService.error(result1.message, 'Error!');
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
                }else{
                    this.selectedCourse(this.staffForm.value.courseId);
                }
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
    // tslint:disable-next-line:typedef
    applyFilter(filterValue: string) {
        this.dataSource.filter = filterValue.trim().toLowerCase();
  
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }
examMasterDetails(row){
  this.parameterService.examMasterDetails = row;
  this.router.navigate(['admin-examination-management/admin-exam-masters/exam-master/exam-master-details']);
}
}