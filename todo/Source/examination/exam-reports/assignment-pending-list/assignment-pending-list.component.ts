import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { CONSTANTS } from 'app/main/common/constants';
import { Router, ActivatedRoute } from '@angular/router';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GlobalService } from 'app/main/services/global.service';
import { GridComponent, PdfExportProperties } from '@syncfusion/ej2-angular-grids';
import { ClickEventArgs } from '@syncfusion/ej2-navigations';

@Component({
  selector: 'app-assignment-pending-list',
  templateUrl: './assignment-pending-list.component.html',
  styleUrls: ['./assignment-pending-list.component.scss']
})
export class AssignmentPendingListComponent implements OnInit {

  feeFormGroup: FormGroup;
  displayedValues: string[] = [];
  displayedColumns: string[] = ['Emp_Number', 'Employee_Name', 'Attendance_Date', 'WeekDay', 'Login', 'Logout', 'Is_Present', 
                                'Day', 'Late_By', 'Early_By', 'Running_Late_Minutes', 'Is_Forenoon_Leaves', 'Is_Afternoon_Leaves', 'Remarks'];
  columns = [];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private getAssignmentPendingListUrl = CONSTANTS.getAssignmentPendingListUrl;
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private isActive = CONSTANTS.isActive;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private getDetailsByGroupUrl = CONSTANTS.getDetailsByGroupUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private sortOrder = CONSTANTS.sortOrder;
  private groupSectionCrudUrl = CONSTANTS.groupSectionCrudUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private getDetailsByCourseYearIdUrl = CONSTANTS.getDetailsByCourseYearIdUrl;
  private collegewisedetailsUrl=CONSTANTS.collegewisedetailsUrl;
  filtersDetailsList=[];
  CollegesListDetails=[];
  CollegeIdData=[];
  courseList=[];
  courseYearList=[];
  collegeId = localStorage.getItem('collegeId');
  colleges: any[] = [];
  Departments: any[] = [];
  feeStructures: any[] = [];
  courses = [];
  courseYears = [];
  public gridData: any[];
  public toolbar: string[];
  // tslint:disable-next-line: ban-types
  public pageSettings: Object;
  @ViewChild('grid')
  public grid: GridComponent;
  // tslint:disable-next-line: ban-types
  public initialPage: Object;
  dataDetails = ' ';

  studentDueList: any[] = [];
  step = 0;
  studentsCount = 0;
  pageIndex = 0;
  pageSize = 0;
  collegeCode;
  panelOpenState = true;
  keys: any[] = [];
  status;
  check = 'D';
  searchEmployees: any[] = [];
  empId;
  courseGroups = [];
  pageParams: any = {};
  startDate;
  academicYears = [];
  sections = [];
  empSecurity = [];
  dataSecStaff;
  dataSECPrincipal;
  data;
  dataSecurity
  public employeeFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredEmployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
  academicYearsList=[];
  courseListData=[];
  groupList=[];
  courseYearsList=[];
  SectionList=[];
  academicYearData: any;

  constructor(private route: ActivatedRoute, private router: Router, private formBuilder: FormBuilder, private dialog: MatDialog, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions,
              private _globalService: GlobalService) {
                this.dataSecStaff = this.genericFunctions.dataSecurityLevel();
                this.dataSECPrincipal = this.genericFunctions.dataSecurityLevelPrincipal();
                this.dataSecurity = this.genericFunctions.dataSecurity();
                this.startDate = new Date();
                // this._globalService.empSecurity$.subscribe(empSecurity => {
                //   this.empSecurity = empSecurity;
                //   if (this.empSecurity.length > 0){
                //     this.colleges = [];
                //     for (let i = 0; i < this.empSecurity.length; i++){
                //       if (this.colleges.filter(x => (x.collegeId === this.empSecurity[i].collegeId)).length === 0){
                //          this.colleges.push(this.empSecurity[i]);
                //       } 
                //     }  
                //   }else{
                //     this.getData();
                //   }
                // });
                this.toolbar = ['ExcelExport', 'PdfExport','Search'];
                this.pageSettings = { pageSize: 10 };
                this.initialPage = { pageSizes: true, pageCount: 10 };
  }

   // tslint:disable-next-line:typedef
   ngOnInit() {
    this.feeFormGroup = this.formBuilder.group({
      collegeId: ['', Validators.required],
      academicYearId: ['', Validators.required],
      courseId: ['', Validators.required],
      courseGroupId: ['', Validators.required],
      courseYearId: ['', Validators.required],
      groupSectionId: ['', Validators.required],
    });
   
    this.pageParams.path = 'report-catalyst';
    this.route.queryParams.subscribe(params => {
      if (!this.isEmptyObject(params)){
        this.pageParams.path = params.path;
      }
    });
    this.getFiltersList();
    
  }

  getData(): void{
  
    /*----------- COLLEGES -----------*/
    this.crudService.listDetailsById(this.collegeCrudUrl, 'true', this.isActive)
         .subscribe(result => {
             if (result.statusCode === 200){
                     if (result.data.resultList && result.data.resultList !== '') {
                         this.colleges = result.data.resultList;   
                         if (this.colleges.length > 0){
                          this.feeFormGroup.get('collegeId').setValue(+localStorage.getItem('collegeId'));
                          this.selectedCollege(this.feeFormGroup.value.collegeId); 
                       }                   
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
  getFiltersList(): void {
    this.filtersDetailsList=[]
    this.CollegesListDetails=[]
    this.colleges=[]
    this.spinner.show();
    let request = [
      {paramName: 'in_flag', paramValue: 'cls_timtable_filters'},
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
         {paramName: 'in_gm_codes', paramValue:''},
        
         
    ];
    this.crudService.getDetailsByRequest(this.collegewisedetailsUrl, '', request, '&')
  .subscribe(result =>  {
          this.spinner.hide();
          if (result.statusCode === 200) {
            if (result.data && result.data !== '' && result.data.result.length > 0) {
              this.filtersDetailsList = result.data.result;
              for(let i=0; i<this.filtersDetailsList.length; i++){
                if(this.filtersDetailsList[i].length>0 && this.filtersDetailsList[i][0].flag === 'cls_timtable_filters'){
                  this.CollegesListDetails  = this.filtersDetailsList[i];
                  }
   
          }
          const CollegeIdData = this.CollegesListDetails.map(({ fk_college_id }) => fk_college_id);
          this.colleges = this.CollegesListDetails.filter(({ fk_college_id }, index) => 
          !CollegeIdData.includes(fk_college_id, index + 1));
          if (this.colleges.length > 0){
           this.colleges = this.colleges.filter(x => (x.fk_college_id !== null));
            this.colleges = this.colleges.sort((a,b)=>a.clg_sort_order-b.clg_sort_order);
            this.feeFormGroup.get('collegeId').setValue(this.colleges[0].fk_college_id);
            this.selectedCollege(this.feeFormGroup.value.collegeId); 
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
      this.feeFormGroup.get('academicYearId').setValue('');
      this.feeFormGroup.get('courseId').setValue('');
      this.feeFormGroup.get('courseGroupId').setValue('');
      this.feeFormGroup.get('courseYearId').setValue('');
      this.feeFormGroup.get('groupSectionId').setValue('');
      this.academicYears = [];
      this.courses = [];
      this.courseGroups = [];
      this.courseYears = [];
      this.sections = [];
    /*----------- ACADEMIC YEARS -----------*/
    this.academicYearsList=[];
    this.academicYearsList = this.CollegesListDetails.filter(x=>(x.fk_college_id == collegeId))
    if(this.academicYearsList.length > 0){
        const Academic_yrData = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
        this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) =>
          !Academic_yrData.includes(fk_academic_year_id, index + 1));
    }
      if(this.academicYears.length > 0){
          this.feeFormGroup.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
          this.selectedAcademicYear(this.feeFormGroup.value.academicYearId); 
      }   
  //   this.academicYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id==this.feeFormGroup.value.collegeId))
  //         if(this.academicYearsList.length>0){
  //         const academicYears = this.academicYearsList.map(({ fk_academic_year_id }) => fk_academic_year_id);
  //         this.academicYears = this.academicYearsList.filter(({ fk_academic_year_id }, index) => !academicYears.includes(fk_academic_year_id, index + 1));
  //         this.academicYears = this.academicYears.sort((a,b)=>parseInt(b.academic_year)-parseInt(a.academic_year))

  //         }
  
  // if(this.academicYears.length>0){
  //   this.feeFormGroup.get('academicYearId').setValue(this.academicYears[0].fk_academic_year_id);
  //   this.selectedAcademicYear( this.feeFormGroup.value.academicYearId)
  // }		 
  
    //   this.crudService.listDetailsByTwoIdsWithSort(this.academicYearCrudUrl, collegeId, 'true', 'DESC', this.getDetailsByCollegeIdUrl, this.isActive, 'fromDate')
    // .subscribe(result => {
    //     if (result.statusCode === 200) {
    //         if (result.data.resultList && result.data.resultList !== '') {
    //             this.academicYears = result.data.resultList;
    //           //   if (this.academicYears.length > 0 ){
    //           //      if (this.academicYears.filter(x => (x.academicYearId === +this.defaultAcademicYearId)).length > 0){
    //           //         this.feeFormGroup.get('academicYearId').setValue(+this.defaultAcademicYearId);
    //           //         this.selectedAcademicYear(this.feeFormGroup.value.academicYearId); 
    //           //      } 
    //           //  }
    //         } else {
    //             this.snotifyService.success(result.message, 'Success!');
    //         }
    //     }else {
    //       this.snotifyService.error(result.message, 'Error!');
    //   }
    // }, error => {
    //   if (error.error.statusCode === 401){
    //       this.snotifyService.error(error.error.message, 'Error!');
    //       this.genericFunctions.logOut(this.router.url);
    //   }else{
    //       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //   }
    // });

  }

  // tslint:disable-next-line:typedef
  selectedAcademicYear(academicYearId){

      this.feeFormGroup.get('courseId').setValue('');
      this.feeFormGroup.get('courseGroupId').setValue('');
      this.feeFormGroup.get('courseYearId').setValue('');
      this.feeFormGroup.get('groupSectionId').setValue('');
      this.courses = [];
      this.courseGroups = [];
      this.courseYears = [];
      this.sections = [];
      if (academicYearId !== null && academicYearId !== ''){
    /*----------- COURSES -----------*/
    this.courseListData=[]
    this.courseListData=this.CollegesListDetails.filter(x=>(x.fk_college_id==this.feeFormGroup.value.collegeId && x.fk_academic_year_id === this.feeFormGroup.value.academicYearId ))
            if(this.courseListData.length>0){
                const courseList = this.courseListData.map(({ fk_course_id }) => fk_course_id);
                this.courses = this.courseListData.filter(({ fk_course_id }, index) =>
                !courseList.includes(fk_course_id, index + 1));
            }
            if (this.courses.length > 0){
              this.feeFormGroup.get('courseId').setValue(this.courses[0].fk_course_id);
              this.selectedCourse(this.feeFormGroup.value.courseId); 
           } 
//     this.crudService.listDetailsByTwoIds(this.courseCrudUrl, this.feeFormGroup.value.collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
//     .subscribe(result => {
//         if (result.statusCode === 200){
//                 if (result.data.resultList && result.data.resultList !== '') {
//                     this.courses = result.data.resultList; 
//                     if (this.courses.length > 0){
//                       this.feeFormGroup.get('courseId').setValue(this.courses[0].courseId);
//                       this.selectedCourse(this.feeFormGroup.value.courseId); 
//                    }                    
//                 } else {
//                     this.snotifyService.success(result.message, 'Success!');
//                 }
//             }else {
//               this.snotifyService.error(result.message, 'Error!');
//           }
        
//     }, error => {
//       if (error.error.statusCode === 401){
//           this.snotifyService.error(error.error.message, 'Error!');
//           this.genericFunctions.logOut(this.router.url);
//       }else{
//           this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
//       }
// });
}
  }
  selectedCourse(courseId): void{
      this.courseGroups = [];
      this.courseYears = [];
      this.sections = [];
      this.feeFormGroup.get('courseGroupId').setValue('');
      this.feeFormGroup.get('courseYearId').setValue('');
      this.feeFormGroup.get('groupSectionId').setValue('');
    /*----------- COURSES GROUPS -----------*/  
    this.groupList=[]
    this.groupList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.feeFormGroup.value.collegeId && x.fk_academic_year_id === this.feeFormGroup.value.academicYearId
       && x.fk_course_id==this.feeFormGroup.value.courseId))
       if(this.groupList.length>0){
       const groupList = this.groupList.map(({ fk_course_group_id }) => fk_course_group_id);
       this.courseGroups = this.groupList.filter(({ fk_course_group_id }, index) => !groupList.includes(fk_course_group_id, index + 1));
       }
       if (this.courseGroups.length > 0){
        this.feeFormGroup.get('courseGroupId').setValue(this.courseGroups[0].fk_course_group_id);
         this.selectedGroup(this.feeFormGroup.value.courseGroupId); 
     }    
    //   this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
    // .subscribe(result => {
    //     if (result.statusCode === 200) {
    //         if (result.data.resultList && result.data.resultList !== '') {
    //             this.courseGroups = result.data.resultList;
    //             if (this.courseGroups.length > 0){
    //               this.feeFormGroup.get('courseGroupId').setValue(+localStorage.getItem('courseGroupId'));
    //               this.selectedGroup(this.feeFormGroup.value.courseGroupId); 
    //            }
    //         } else {
    //             this.snotifyService.success(result.message, 'Success!');
    //         }
    //     }else {
    //       this.snotifyService.error(result.message, 'Error!');
    //   }
    // }, error => {
    //   if (error.error.statusCode === 401){
    //       this.snotifyService.error(error.error.message, 'Error!');
    //       this.genericFunctions.logOut(this.router.url);
    //   }else{
    //       this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //   }
    // });

  }

  selectedGroup(courseGroupId): void{
      this.courseYears = [];
      this.sections = [];
      this.feeFormGroup.get('courseYearId').setValue('');
      this.feeFormGroup.get('groupSectionId').setValue('');
      if (this.feeFormGroup.value.collegeId != null && courseGroupId != null){
        this.courseYearsList=[]
      /*----------- COURSES Years -----------*/      
      this.courseYearsList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.feeFormGroup.value.collegeId && x.fk_academic_year_id === this.feeFormGroup.value.academicYearId
        && x.fk_course_id==this.feeFormGroup.value.courseId && x.fk_course_group_id==this.feeFormGroup.value.courseGroupId))
      if(this.courseYearsList.length>0){
      const courseYearsList = this.courseYearsList.map(({ fk_course_year_id }) => fk_course_year_id);
      this.courseYears = this.courseYearsList.filter(({ fk_course_year_id }, index) => !courseYearsList.includes(fk_course_year_id, index + 1));
      this.courseYears=this.courseYears.sort((a,b)=>a.year_order-b.year_order)

      }
      if(this.courseYears.length>0){
       this.feeFormGroup.get('courseYearId').setValue(this.courseYears[0].fk_course_year_id);
       this.selectedYear(this.feeFormGroup.value.courseYearId)
     }
      // this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.feeFormGroup.value.courseId, 'true', 'ASC',
      // this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
      // .subscribe(result => {
      //     this.spinner.hide();
      //     if (result.statusCode === 200) {
      //         if (result.data.resultList && result.data.resultList !== '') {
      //             this.courseYears = result.data.resultList;
      //             if (this.courseYears.length > 0){
      //                 this.feeFormGroup.get('courseYearId').setValue(this.courseYears[0].courseYearId);
      //                 this.selectedYear(this.feeFormGroup.value.courseYearId); 
      //              }
      //         } else {
      //             this.snotifyService.success(result.message, 'Success!');
      //         }
      //     }else {
      //         this.snotifyService.error(result.message, 'Error!');
      //     }
      // }, error => {
      //     this.spinner.hide();
      //     if (error.error.statusCode === 401){
      //         this.snotifyService.error(error.error.message, 'Error!');
      //         this.genericFunctions.logOut(this.router.url);
      //     }else{
      //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
      //     }
      // });
    }
  }

  selectedYear(courseYearId): void{
      this.sections = [];
      this.SectionList=[]
      this.feeFormGroup.get('groupSectionId').setValue('');
      if (this.feeFormGroup.value.collegeId != null && courseYearId != null){
      /*----------- COURSES YEARS -----------*/      
      this.SectionList=this.CollegesListDetails.filter(x=>(x.fk_college_id== this.feeFormGroup.value.collegeId && x.fk_academic_year_id === this.feeFormGroup.value.academicYearId
         && x.fk_course_id==this.feeFormGroup.value.courseId && x.fk_course_group_id==this.feeFormGroup.value.courseGroupId && x.fk_course_year_id==this.feeFormGroup.value.courseYearId))
      if(this.courseYearsList.length>0){
      const SectionList = this.SectionList.map(({ fk_group_section_id }) => fk_group_section_id);
      this.sections = this.SectionList.filter(({ fk_group_section_id }, index) => !SectionList.includes(fk_group_section_id, index + 1));
      this.sections=this.sections.sort((a,b)=>a.fk_group_section_id-b.fk_group_section_id)

      }
    //   if(this.sections.length>0){
    //    this.feeFormGroup.get('groupSectionId').setValue(this.courseYears[0].fk_group_section_id);
    //    this.selectedYear(this.feeFormGroup.value.groupSectionId)
    //  }
      // tslint:disable-next-line:max-line-length
      // this.crudService.listDetailsByFourIds(this.groupSectionCrudUrl, courseYearId, this.feeFormGroup.value.academicYearId, this.feeFormGroup.value.courseGroupId, 'true', this.getDetailsByCourseYearIdUrl, 
      //   this.getDetailsByAcademicYearIdUrl, this.getDetailsByGroupUrl, this.isActive)
      // .subscribe(result => {
      //     this.spinner.hide();
      //     if (result.statusCode === 200) {
      //         if (result.data.resultList && result.data.resultList !== []) {
      //             this.sections = result.data.resultList;
      //         } else {
      //             this.snotifyService.success(result.message, 'Success!');
      //         }
      //     }else {
      //         this.snotifyService.error(result.message, 'Error!');
      //     }
      // }, error => {
      //     this.spinner.hide();
      //     if (error.error.statusCode === 401){
      //         this.snotifyService.error(error.error.message, 'Error!');
      //         this.genericFunctions.logOut(this.router.url);
      //     }else{
      //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
      //     }
      // });
    }
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  goBack(): void{
    this.router.navigate([this.pageParams.path]);
  } 

     // tslint:disable-next-line:typedef
     OnDestroy() {
      this._onDestroy.next();
      this._onDestroy.complete();
    }
  
  getEmpAttendanceReport(): void{
    this.studentDueList = [];
    this.columns = [];
    if (this.feeFormGroup.valid){
    this.spinner.show();
 /*----------- STUDENTS -----------*/
    this.crudService.listByFourIds(this.getAssignmentPendingListUrl, this.feeFormGroup.value.collegeId,
      this.feeFormGroup.value.courseYearId, 
      this.feeFormGroup.value.groupSectionId, 0,
      'in_clg_id', 'in_course_year_id', 'in_section_id','in_emp_id')
      .subscribe(result => {
       this.spinner.hide();
       if (result.statusCode === 200){
            if (result.success) {
                this.studentDueList = result.data.result[0]; 
                this.gridData = this.studentDueList;
                            for ( let idx = 0; idx < this.gridData.length; idx++) {
                              this.gridData[idx].id = idx + 1;
                            } 
                
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

  clear(): void{
    this.studentDueList = [];
  }
   
  toolbarClick(args: ClickEventArgs): void {
    if (args.item.text === 'Excel Export') {
       this.grid.excelExport(this.genericFunctions.getExcelExportProperties( this.dataDetails, 'Enquirers Report'));
            // this.grid.excelExport();
    } else
    if(args.item.text === 'PDF Export') {
      const exportProperties: PdfExportProperties = this.genericFunctions.getPdfExportPropertiesPortraitscape(this.dataDetails, 'Enquirers Report');
      this.grid.pdfExport(exportProperties);
      // this.grid.pdfExport();
    }
  }

}
