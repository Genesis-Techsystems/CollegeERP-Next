import { Component, OnInit, ViewChild, Inject, ElementRef } from '@angular/core';
import { FormGroup, FormControl, FormBuilder, Validators, NgForm } from '@angular/forms';
import { College } from 'app/main/models/college';
import { GeneralDetail } from 'app/main/models/generalDetail';
import { CONSTANTS } from 'app/main/common/constants';
import { Subject, ReplaySubject } from 'rxjs';
import {Location} from '@angular/common';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CampusModalComponent } from 'app/main/apps/admin/campus/campus-modal/campus-modal.component';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router, ActivatedRoute } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import *  as moment from 'moment';

import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-send-tt-notification',
  templateUrl: './send-tt-notification.component.html',
  styleUrls: ['./send-tt-notification.component.scss']
})
export class SendTtNotificationComponent implements OnInit {
  displayedColumns: string[] = ['id', 'audienceTypeName', 'categoryName', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  @ViewChild('notificationDocAvatar') notificationDocAvatar: ElementRef;

  eventForm: FormGroup;
  notificationAudiencesForm: FormGroup;
  colleges: College[] = [];
  notification: any[] = [];
  dialogTitle;
  eventTypes: any[] = [];
  academicYears: any[] = [];
  eventStatuses: GeneralDetail[] = [];
  audienceTypes: GeneralDetail[] = [];
  courses: any[] = [];
  courseGroups: any[] = [];
  courseYears: any[] = [];
  sections: any[] = [];
  notificationAudiences = [];
  categoryName;
  categoryValue;
  courseId;
  departments: any[] = [];
  courseName;
  searchSections = [];
  deletedAudiences = [];
  flag = false;
  step = 0;
  data: any = {};
  params: any = {};
  pageParams: any = {};
  size2;
  public formData;
  isFile = false;
  selectedFlag = false;
  selectedFlagDept = false;
  dataSecStaff;
  dataSECPrincipal;
dataDetails = ' ';
  private collegeCrudUrl = CONSTANTS.collegeCrudUrl;
  private isActive = CONSTANTS.isActive;
  private eventTypeUrl = CONSTANTS.eventTypeUrl;
  private academicYearCrudUrl = CONSTANTS.academicYearCrudUrl;
  private getDetailsByCollegeIdUrl = CONSTANTS.getDetailsByCollegeIdUrl;
  private audience = CONSTANTS.audience;
  private eventStatus = CONSTANTS.eventStatus;
  private generalDetailsUrl = CONSTANTS.generalDetailsUrl;
  private generalDetailsByCodeUrl = CONSTANTS.generalDetailsByCodeUrl;
  private courseCrudUrl = CONSTANTS.courseCrudUrl;
  private courseYearCrudUrl = CONSTANTS.courseYearCrudUrl;
  private courseGroupCrudUrl = CONSTANTS.courseGroupCrudUrl;
  private getDetailsByCourseIdUrl = CONSTANTS.getDetailsByCourseIdUrl;
  private groupSectionCrudUrl = CONSTANTS.groupSectionCrudUrl;
  private getDetailsByAcademicYearIdUrl = CONSTANTS.getDetailsByAcademicYearIdUrl;
  private getDetailsByGroupUrl = CONSTANTS.getDetailsByGroupUrl;
  private getDetailsByCourseYearIdUrl = CONSTANTS.getDetailsByCourseYearIdUrl;
  private departmentCrudUrl = CONSTANTS.departmentCrudUrl;
  private notificationsUrl = CONSTANTS.notificationsUrl;
  private notificationUrl = CONSTANTS.notificationUrl;
  private notificationIdUrl = CONSTANTS.notificationIdUrl;
  private sortOrder = CONSTANTS.sortOrder;
  private notificationUploadUrl = CONSTANTS.notificationUploadUrl;

  public publisherFilterCtrl: FormControl = new FormControl();
  private _onDestroy = new Subject<void>();
  public filteredpublishers: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

  public publisherMultiCtrl: FormControl = new FormControl();

  constructor(private _location: Location, private route: ActivatedRoute, private dialog: MatDialog, private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, 
              private snotifyService: SnotifyService,
              private crudService: CrudService, public router: Router, private spinner: NgxSpinnerService) {
                this.dataSecStaff = this.genericFunctions.dataSecurityLevel();
                this.dataSECPrincipal = this.genericFunctions.dataSecurityLevelPrincipal();
     // this.getData();
  }

  // tslint:disable-next-line:typedef
  ngOnInit() {

    this.route.queryParams
    .subscribe(params => {
       this.params = params;
       this.pageParams.collegeId = this.params.collegeId;
       this.pageParams.academicYearId = this.params.academicYearId;
       this.pageParams.notificationId = this.params.notificationId;
        
       this.pageParams.param = true;
       this.getData();
    });

    this.dialogTitle = 'Add Notfication';
    this.eventForm = this.formBuilder.group({
          // collegeId: ['', Validators.required],
          // academicYearId: ['', Validators.required],       
          isActive: [true],
          notificationTitle: ['', Validators.required],
        //  startDate: [moment().format()],
          notificationEnddate: [moment().format()],
          publishDate: [moment().format()],
          isPublished: [true],
          description : [],
          isAnnouncement: [false],
          reason: []
      });

    this.eventForm.get('reason').setValue('active');
    this.selectedCollege( this.pageParams.collegeId);

     // if (!this.isEmptyObject(this.data) && this.data.notificationId) {
    if ( this.pageParams.notificationId !== null && this.pageParams.notificationId !== undefined) {
        this.getINotificationById(this.pageParams.notificationId);
      }

    this.notificationAudiencesForm = this.formBuilder.group({
        courseId: [],
        audienceTypeId: ['', Validators.required],
        courseGroupId: [],
        groupSectionId: [],
        courseYearId: [],
        departmentId: [],
      });

    this.searchSections.push({publishername: 'Search by publisher name.'});
    this.filteredpublishers.next(this.searchSections.slice());

    this.publisherFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => {
        this.filterSections();
      });
  }

  filterSections(): void {
    if (!this.searchSections) {
      return;
    }
    // get the search keyword
    let search = this.publisherFilterCtrl.value;
    if (!search) {
      this.filteredpublishers.next(this.searchSections.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    // filter the banks
    this.filteredpublishers.next(
      this.searchSections.filter(x => x.section.toLowerCase().indexOf(search) > -1)
    );

    this.deletedAudiences = [];
  }

  getData(): void {
      /*---------- GET EVENTS TYPES --------------*/
      this.crudService.listDetailsByTwoIds(this.eventTypeUrl, 'true', this.pageParams.collegeId, this.isActive, this.getDetailsByCollegeIdUrl)
      .subscribe(result => {
          this.getGeneralDetails();
          if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '') {
                  this.eventTypes = result.data.resultList;
              } else {
                  this.snotifyService.success(result.message, 'Success!');
              }
          } else {
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

   // tslint:disable-next-line: typedef
   selectedAudienceType(audienceTypeId){
       if (this.audienceTypes.filter(x => (x.generalDetailId === audienceTypeId))[0].generalDetailCode === 'STD' ||
        this.audienceTypes.filter(x => (x.generalDetailId === audienceTypeId))[0].generalDetailCode === 'Parents' ) {
        this.selectedFlag = true;
        this.selectedFlagDept = false;
       } else 
       if (this.audienceTypes.filter(x => (x.generalDetailId === audienceTypeId))[0].generalDetailCode === 'TCHNGSTF'){
        this.selectedFlag = false;
        this.selectedFlagDept = true;
        if (this.dataSecStaff && this.departments.length > 0){
            this.notificationAudiencesForm.get('departmentId').setValue(+localStorage.getItem('empDeptId'));
            this.dataDetails =  this.dataDetails + ' / ' + this.departments.filter(x => (x.courseId === this.notificationAudiencesForm.value.departmentId))[0].deptName;
            
         }
       }else{
        this.selectedFlag = false;
        this.selectedFlagDept = false;
       }
     
   }

   getGeneralDetails(): void{
    /*----------- EVENT STATUSES -----------*/
    this.crudService.listDetailsByTwoIds(this.generalDetailsUrl, this.eventStatus , 'true', this.generalDetailsByCodeUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.eventStatuses = result.data.resultList;
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

      /*----------- AUDIENCE TYPES -----------*/
    this.crudService.listDetailsByTwoIdsWithSort(this.generalDetailsUrl, this.audience , 'true', 'ASC', this.generalDetailsByCodeUrl, this.isActive, 'generalDetailSortOrder')
    .subscribe(result => {
        if (result.statusCode === 200){
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.audienceTypes = result.data.resultList;
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

   selectedCollege(collegeId): void{

    /*----------- COURSES -----------*/
    this.crudService.listDetailsByTwoIds(this.courseCrudUrl, collegeId, 'true', this.getDetailsByCollegeIdUrl, this.isActive)
    .subscribe(result => {
        if (result.statusCode === 200){
                if (result.data.resultList && result.data.resultList !== '') {
                    this.courses = result.data.resultList;
                    if (this.dataSecStaff && this.courses.length > 0){
                        this.notificationAudiencesForm.get('courseId').setValue(+localStorage.getItem('courseId'));
                        this.dataDetails =  this.dataDetails + ' / ' + this.courses.filter(x => (x.courseId === this.notificationAudiencesForm.value.courseId))[0].courseCode;
                        this.selectedCourse(this.notificationAudiencesForm.value.courseId); 
                     }
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

    /*----------- DEPARTMENTS -----------*/
    this.crudService.listDetailsByTwoIds(this.departmentCrudUrl, collegeId, 'true', this.getDetailsByCollegeIdUrl, 'isActive')
    .subscribe(result => {
        if (result.statusCode === 200) {
            if (result.success) {
                this.departments = result.data.resultList;
            } else {
                this.snotifyService.success(result.message, 'Success!');
            }
        } else {
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

  
  selectedCourse(courseId): void{
    /*........ Clean Default Selected ......... */
    this.notificationAudiencesForm.get('courseGroupId').setValue('');
    this.notificationAudiencesForm.get('courseYearId').setValue('');
    this.courseGroups = [];
    this.courseYears = [];
  /*----------- COURSES GROUPS -----------*/      
    this.crudService.listDetailsByTwoIds(this.courseGroupCrudUrl, courseId, 'true', this.getDetailsByCourseIdUrl, this.isActive)
  .subscribe(result => {
      if (result.statusCode === 200) {
          if (result.data.resultList && result.data.resultList !== '') {
              this.courseGroups = result.data.resultList;
              if (this.dataSecStaff && this.courseGroups.length > 0){
                this.notificationAudiencesForm.get('courseGroupId').setValue(+localStorage.getItem('courseGroupId'));
                this.dataDetails =  this.dataDetails + ' / ' + this.courseGroups.filter(x => (x.courseGroupId === this.notificationAudiencesForm.value.courseGroupId))[0].groupCode;
                this.selectedGroup(this.notificationAudiencesForm.value.courseGroupId); 
             }
          } else {
              this.snotifyService.success(result.message, 'Success!');
          }
      } else {
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

selectedGroup(courseGroupId): void{
     /*........ Clean Default Selected ......... */
    this.notificationAudiencesForm.get('courseYearId').setValue('');
    this.courseYears = [];

    if (courseGroupId != null){
    /*----------- COURSES YEARS -----------*/      
    
    this.crudService.listDetailsByTwoIdsWithSortLtd(this.courseYearCrudUrl, this.notificationAudiencesForm.value.courseId, 'true', 'ASC',
     this.getDetailsByCourseIdUrl, this.isActive, this.sortOrder)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200) {
            if (result.data.resultList && result.data.resultList !== '') {
                this.courseYears = result.data.resultList;
            } else {
                this.snotifyService.success(result.message, 'Success!');
            }
        } else {
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

selectedYear(courseYearId): void{
    this.notificationAudiencesForm.get('groupSectionId').setValue('');
    this.sections = [];

    if (courseYearId != null){
      /*----------- COURSES SECTIONS -----------*/      
      
      // tslint:disable-next-line:max-line-length
      this.crudService.listDetailsByFourIds(this.groupSectionCrudUrl, this.pageParams.academicYearId, this.notificationAudiencesForm.value.courseGroupId, courseYearId,  'true',
        this.getDetailsByAcademicYearIdUrl, this.getDetailsByGroupUrl, this.getDetailsByCourseYearIdUrl,  this.isActive)
      .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200) {
              if (result.data.resultList && result.data.resultList !== '') {
                  this.sections = result.data.resultList;
                  this.searchSections = result.data.resultList;
                  this.filteredpublishers.next(this.searchSections.slice());
              } else {
                  this.snotifyService.success(result.message, 'Success!');
              }
          } else {
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

  addDetails(item, form: NgForm): void{
    if (this.notificationAudiencesForm.valid){
        // tslint:disable-next-line:max-line-length
        if (item.departmentId != null || this.notificationAudiencesForm.value.courseId ){
            this.flag = false;
            if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId)).length > 0){
                if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'ALL'){
                    this.categoryName = 'all';
                    this.categoryValue = 'all';
                    this.courseId = null;
                }else if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'TCHNGSTF'){ 
                    if (this.departments.filter(x => (x.departmentId === item.departmentId)).length > 0){
                        this.categoryName = 'department' + '-' + '(' + this.departments.filter(x => (x.departmentId === item.departmentId))[0].deptName + ')';
                    }else{
                        this.categoryName = 'department';
                    }
                    this.categoryValue = this.notificationAudiencesForm.value.departmentId;
                    this.courseId = null;
                }else if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'STD'){
                   
                    this.courseId = this.notificationAudiencesForm.value.courseId;
                    if (this.notificationAudiencesForm.value.courseId) {
                        /*  For Section  */
                        if ( this.publisherMultiCtrl.value != null && this.publisherMultiCtrl.value.length > 0){
                            for (let i = 0; i < this.publisherMultiCtrl.value.length; i++){
                                if (i === 0){
                                    this.categoryValue = this.publisherMultiCtrl.value[i];
                                    if (this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i])).length > 0){
                                        // tslint:disable-next-line:max-line-length
                                        this.categoryName = 'section' + '-' + '(' + this.courses.filter(x => (x.courseId === item.courseId))[0].courseCode + '/' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].groupCode + '/' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].courseYearName + ')' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].section;
                                    }
                                }else{
                                    if (this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i])).length > 0){
                                        this.categoryName = this.categoryName + ',' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].section;
                                    }
                                    this.categoryValue = this.categoryValue + ',' + this.publisherMultiCtrl.value[i];
                                }
                            }
                        }else
                        if (this.notificationAudiencesForm.value.courseYearId){
                              /*  For Semester  */
                            // tslint:disable-next-line: max-line-length
                            this.categoryName = 'courseYear' + '-' + '(' + this.courseYears.filter(x => (x.courseYearId === this.notificationAudiencesForm.value.courseYearId))[0].courseCode + '/' + this.courseGroups.filter(x => (x.courseGroupId === this.notificationAudiencesForm.value.courseGroupId))[0].groupCode  + ')' + this.courseYears.filter(x => (x.courseYearId === this.notificationAudiencesForm.value.courseYearId))[0].courseYearName;
                            this.categoryValue = this.notificationAudiencesForm.value.courseYearId;
                            this.flag = true;
                         }else
                         if (this.notificationAudiencesForm.value.courseGroupId){
                            /*  For Semester  */
                          // tslint:disable-next-line: max-line-length
                          this.categoryName = 'courseGroup' + '-' + '(' + this.courses.filter(x => (x.courseId === this.notificationAudiencesForm.value.courseId))[0].courseCode + ')' + this.courseGroups.filter(x => (x.courseGroupId === this.notificationAudiencesForm.value.courseGroupId))[0].groupCode;
                          this.categoryValue = this.notificationAudiencesForm.value.courseGroupId;
                          this.flag = true;
                       }else{
                        if (this.notificationAudiencesForm.value.courseId){
                            /*  For Semester  */
                          // tslint:disable-next-line: max-line-length
                          this.categoryName = 'course' + '-' + '(' + this.courses.filter(x => (x.courseId === this.notificationAudiencesForm.value.courseId))[0].courseCode + ')'; 
                          this.categoryValue = this.notificationAudiencesForm.value.courseId;
                          this.flag = true;
                        }
                       }
                        
                    } else {
                        this.snotifyService.info('Select atleast one section.', 'Info!');
                    }
                  
                    
                }else if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'Parents'){
                    // this.categoryName = 'section';
                  if ( this.publisherMultiCtrl.value != null && this.publisherMultiCtrl.value.length > 0){
                    for (let i = 0; i < this.publisherMultiCtrl.value.length; i++){
                        
                        if (i === 0){
                            this.categoryValue = this.publisherMultiCtrl.value[i];
                            if (this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i])).length > 0){
                                // tslint:disable-next-line:max-line-length
                                this.categoryName = 'section' + '-' + '(' + this.courses.filter(x => (x.courseId === item.courseId))[0].courseCode + '/' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].groupCode + '/' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].courseYearName + ')' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].section;
                            }
                        }else{
                            this.categoryValue = this.categoryValue + ',' + this.publisherMultiCtrl.value[i];
                            if (this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i])).length > 0){
                                this.categoryName = this.categoryName + ',' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].section;
                            }
                        }
                    }
                    
                    this.courseId = this.notificationAudiencesForm.value.courseId;
                }else{
                    this.snotifyService.info('Select atleast one section.', 'Info!');
                }
                }
                
            }
        
            if (this.courses.filter(x => (x.courseId === this.courseId)).length > 0){
                this.courseName = this.courses.filter(x => (x.courseId === this.courseId))[0].courseName;
            }else{
                this.courseName = null;
            }
    
            // tslint:disable-next-line:max-line-length
            if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId)).length > 0){
                if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].audienceTypeCode === 'ALL'){
                    // this.snotifyService.info('Already Exits.', 'Info!');
                }else{
                    this.flag = true;
                }
                if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].audienceTypeCode === 'TCHNGSTF'){
                    if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length > 0){
                        // tslint:disable-next-line: prefer-for-of
                        for (let i = 0; i < this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length; i++){
                            // tslint:disable-next-line:max-line-length
                            if (this.categoryValue === this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue){
                                this.flag = false;
                                break;
                            }else{
                                this.flag = true;
                            }
                        }
                    }else{
                        if (this.categoryValue === this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue){
                            this.flag = false;
                        }else{
                            this.flag = true;
                        }
                    }
                    
                    
                }
                if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].audienceTypeCode === 'STD'){
                    if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length > 0){
                        // tslint:disable-next-line: prefer-for-of
                        for (let i = 0; i < this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length; i++){
                            // tslint:disable-next-line:max-line-length
                            if (this.publisherMultiCtrl.value.filter(x => (x === +this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',')[i])).length > 0){
                                this.flag = false;
                                break;
                            }else{
                                this.flag = true;
                            }
                        }
                    }else{
                        // tslint:disable-next-line:max-line-length
                        if (this.publisherMultiCtrl.value.filter(x => (x === this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue)).length > 0){
                            this.flag = false;
                        }else{
                            this.flag = true;
                        }
                    }
                    
                }
                if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].audienceTypeCode === 'Parents'){
                    if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length > 0){
                        // tslint:disable-next-line: prefer-for-of
                        for (let i = 0; i < this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length; i++){
                            // tslint:disable-next-line:max-line-length
                            if (this.publisherMultiCtrl.value.filter(x => (x === +this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',')[i])).length > 0){
                                this.flag = false;
                                break;
                            }else{
                                this.flag = true;
                            }
                        }
                    }else{
                        // tslint:disable-next-line:max-line-length
                        if (this.publisherMultiCtrl.value.filter(x => (x === this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue)).length > 0){
                            this.flag = false;
                        }else{
                            this.flag = true;
                        }
                    }
                    
                }
            }else{
                this.flag = true;
            }
    
            if (this.flag){
                this.notificationAudiences.push({
                    audienceTypeId: item.audienceTypeId,
                    audienceTypeCode: this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode,
                    collegeId: this.pageParams.collegeId,
                    courseId: this.courseId,
                    courseName: this.courseName,
                    categoryName: this.categoryName,
                    categoryValue: this.categoryValue,
                    isActive: true,
                });
            }else{
                this.snotifyService.info('Already exists in event audience.', 'Info!');
            }
        
           // this.notificationAudiencesForm.get('feeCategoryId').setValue(null);
            this.dataSource = new MatTableDataSource(this.notificationAudiences); 
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;
            this.notificationAudiencesForm.reset();
            this.publisherMultiCtrl.setValue([]);
        } else{
            if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'ALL' || 
            this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'NTCHNGSTF' || 
            this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'ALLTCHNGSTF'){
                this.flag = false;
                if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId)).length > 0){
                    if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'ALL'){
                        this.categoryName = 'all';
                        this.categoryValue = 'all';
                        this.courseId = null;
                    }else if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'TCHNGSTF'){ 
                        if (this.departments.filter(x => (x.departmentId === item.departmentId)).length > 0){
                            this.categoryName = 'department' + '-' + '(' + this.departments.filter(x => (x.departmentId === item.departmentId))[0].deptName + ')';
                        }else{
                            this.categoryName = 'department';
                        }
                        this.categoryValue = this.notificationAudiencesForm.value.departmentId;
                        this.courseId = null;
                    }else
                    if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'NTCHNGSTF'){ 
                        this.categoryName = 'ALL';
                        this.categoryValue = 'ALL';
                        this.courseId = null;
                    }else
                    if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'ALLTCHNGSTF'){ 
                        this.categoryName = 'All';
                        this.categoryValue = 'All';
                        this.courseId = null;
                    }else
                     if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'STD'){
                       
                        this.courseId = this.notificationAudiencesForm.value.courseId;
                        if ( this.publisherMultiCtrl.value != null && this.publisherMultiCtrl.value.length > 0){
                            for (let i = 0; i < this.publisherMultiCtrl.value.length; i++){
                                if (i === 0){
                                    this.categoryValue = this.publisherMultiCtrl.value[i];
                                    if (this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i])).length > 0){
                                        // tslint:disable-next-line:max-line-length
                                        this.categoryName = 'section' + '-' + '(' + this.courses.filter(x => (x.courseId === item.courseId))[0].courseCode + '/' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].groupCode + '/' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].courseYearName + ')' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].section;
                                    }
                                }else{
                                    if (this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i])).length > 0){
                                        this.categoryName = this.categoryName + ',' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].section;
                                    }
                                    this.categoryValue = this.categoryValue + ',' + this.publisherMultiCtrl.value[i];
                                }
                            }
                        }else{
                            this.snotifyService.info('Select atleast one section.', 'Info!');
                        }
                        
                    }else if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'Parents'){
                        // this.categoryName = 'section';
                      if ( this.publisherMultiCtrl.value != null && this.publisherMultiCtrl.value.length > 0){
                        for (let i = 0; i < this.publisherMultiCtrl.value.length; i++){
                            
                            if (i === 0){
                                this.categoryValue = this.publisherMultiCtrl.value[i];
                                if (this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i])).length > 0){
                                    // tslint:disable-next-line:max-line-length
                                    this.categoryName = 'section' + '-' + '(' + this.courses.filter(x => (x.courseId === item.courseId))[0].courseCode + '/' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].groupCode + '/' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].courseYearName + ')' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].section;
                                }
                            }else{
                                this.categoryValue = this.categoryValue + ',' + this.publisherMultiCtrl.value[i];
                                if (this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i])).length > 0){
                                    this.categoryName = this.categoryName + ',' + this.sections.filter(x => (x.groupSectionId === this.publisherMultiCtrl.value[i]))[0].section;
                                }
                            }
                        }
                        
                        this.courseId = this.notificationAudiencesForm.value.courseId;
                    }else{
                        this.snotifyService.info('Select atleast one section.', 'Info!');
                    }
                    }
                }
            
                if (this.courses.filter(x => (x.courseId === this.courseId)).length > 0){
                    this.courseName = this.courses.filter(x => (x.courseId === this.courseId))[0].courseName;
                }else{
                    this.courseName = null;
                }
        
                // tslint:disable-next-line:max-line-length
                if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId)).length > 0){
                    if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].audienceTypeCode === 'ALL'){
                        // this.snotifyService.info('Already Exits.', 'Info!');
                    }else{
                        this.flag = true;
                    }
                    if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].audienceTypeCode === 'TCHNGSTF'){
                        if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length > 0){
                            // tslint:disable-next-line:max-line-length  tslint:disable-next-line: prefer-for-of
                            for (let i = 0; i < this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length; i++){
                                // tslint:disable-next-line:max-line-length
                                if (this.categoryValue === this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue){
                                    this.flag = false;
                                    break;
                                }else{
                                    this.flag = true;
                                }
                            }
                        }else{
                            if (this.categoryValue === this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue){
                                this.flag = false;
                            }else{
                                this.flag = true;
                            }
                        }
                        
                        
                    }
                    if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].audienceTypeCode === 'STD'){
                        if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length > 0){
                            // tslint:disable-next-line:max-line-length tslint:disable-next-line: prefer-for-of
                            for (let i = 0; i < this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length; i++){
                                // tslint:disable-next-line:max-line-length
                                if (this.publisherMultiCtrl.value.filter(x => (x === +this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',')[i])).length > 0){
                                    this.flag = false;
                                    break;
                                }else{
                                    this.flag = true;
                                }
                            }
                        }else{
                            // tslint:disable-next-line:max-line-length
                            if (this.publisherMultiCtrl.value.filter(x => (x === this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue)).length > 0){
                                this.flag = false;
                            }else{
                                this.flag = true;
                            }
                        }
                        
                    }
                    if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].audienceTypeCode === 'Parents'){
                        if (this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length > 0){
                            // tslint:disable-next-line:max-line-length  tslint:disable-next-line: prefer-for-of
                            for (let i = 0; i < this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',').length; i++){
                                // tslint:disable-next-line:max-line-length
                                if (this.publisherMultiCtrl.value.filter(x => (x === +this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue.toString().split(',')[i])).length > 0){
                                    this.flag = false;
                                    break;
                                }else{
                                    this.flag = true;
                                }
                            }
                        }else{
                            // tslint:disable-next-line:max-line-length
                            if (this.publisherMultiCtrl.value.filter(x => (x === this.notificationAudiences.filter(y => (y.audienceTypeId === item.audienceTypeId))[0].categoryValue)).length > 0){
                                this.flag = false;
                            }else{
                                this.flag = true;
                            }
                        }
                        
                    }
                }else{
                    this.flag = true;
                }
                if (this.flag){
                    if (this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode === 'ALLTCHNGSTF'){
                        const typecode = 'TCHNGSTF';
                        this.notificationAudiences.push({
                            audienceTypeId: this.audienceTypes.filter(x => (x.generalDetailCode === 'TCHNGSTF'))[0].generalDetailId,
                            audienceTypeCode: typecode ,
                            collegeId: this.pageParams.collegeId,
                            courseId: this.courseId,
                            courseName: this.courseName,
                            categoryName: this.categoryName,
                            categoryValue: this.categoryValue,
                            isActive: true,
                        });
                    }else{
                        this.notificationAudiences.push({
                            audienceTypeId: item.audienceTypeId,
                            audienceTypeCode: this.audienceTypes.filter(x => (x.generalDetailId === item.audienceTypeId))[0].generalDetailCode,
                            collegeId: this.pageParams.collegeId,
                            courseId: this.courseId,
                            courseName: this.courseName,
                            categoryName: this.categoryName,
                            categoryValue: this.categoryValue,
                            isActive: true,
                        });
                    }
                   
                }else{
                    this.snotifyService.info('Already exists in event audience.', 'Info!');
                }
            
               // this.notificationAudiencesForm.get('feeCategoryId').setValue(null);
                this.dataSource = new MatTableDataSource(this.notificationAudiences); 
                this.dataSource.paginator = this.paginator;
                this.dataSource.sort = this.sort;
                this.notificationAudiencesForm.reset();
                this.publisherMultiCtrl.setValue([]);
            }
            else{
                this.snotifyService.info('Select atleast any audience.', 'Info!');
            }
        }
       
    }

 }

 getINotificationById(id): void {
    this.crudService.getDetailsById(this.notificationUrl, id, this.notificationIdUrl)
    .subscribe(result => {
      if (result.statusCode === 200) {
        if (result.data) {
          this.data = result.data;
           // this.eventForm.get('collegeId').setValue(this.data.collegeId);
         // this.eventForm.get('academicYearId').setValue(this.data.academicYearId);
         
         
          this.eventForm.get('notificationTitle').setValue(this.data.notificationTitle);
         //  this.eventForm.get('startDate').setValue(moment(this.data.startDate).format());
          // this.eventForm.get('notificationEnddate').setValue(this.genericFunctions.momentWithDate(this.data.notificationEnddate));
          this.eventForm.get('publishDate').setValue(moment(this.data.publishDate).format());
          this.eventForm.get('notificationEnddate').setValue(moment(this.data.notificationEnddate).format());
         //  this.eventForm.get('publishDate').setValue(this.genericFunctions.momentWithDate(this.data.publishDate));
          this.eventForm.get('isPublished').setValue(this.data.isPublished);
          this.eventForm.get('description').setValue(this.data.description);
          this.eventForm.get('isAnnouncement').setValue(this.data.isAnnouncement);          
          this.eventForm.get('isActive').setValue(this.data.isActive);
          this.eventForm.get('reason').setValue(this.data.reason);
          

          this.dialogTitle = 'Edit Notification'; 
           
          this.notificationAudiences = [];  
           // this.notificationAudiences = this.data.notificationAudiences;
          // tslint:disable-next-line: prefer-for-of
          for (let i = 0; i < this.data.notificationAudiences.length; i++){
             if (this.data.notificationAudiences[i].isActive){
                 this.notificationAudiences.push(this.data.notificationAudiences[i]);
             }  
           }
          this.dataSource = new MatTableDataSource(this.notificationAudiences);  
          this.dataSource.paginator = this.paginator;
          this.dataSource.sort = this.sort;  
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


//  deleteEventAudience(row, index): void{
//     const dialogRef = this.dialog.open(ConfirmModalComponent, {
//         width: '350px',
//     });

//     dialogRef.afterClosed().subscribe(details => {
//       if (details === 'delete'){
//           if ( index > - 1) {
//             this.notificationAudiences.splice(index, 1);
//           }
//           if (row.notificationAudienceId){
//             row.isActive = false; 
//             this.deletedAudiences.push(row);
//           }
//           this.dataSource = new MatTableDataSource(this.notificationAudiences);  
//           this.dataSource.paginator = this.paginator;
//           this.dataSource.sort = this.sort;
//       }  
//     });
//   }

 clear(form: NgForm): void{
    this.notificationAudiencesForm.reset();
    this.publisherMultiCtrl.setValue([]);
 }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
     // return (obj && (Object.keys(obj).length === 0));
  }

  readFile(): void{
    if (this.notificationDocAvatar.nativeElement.files[0].size > 24000000){
        this.size2 = this.notificationDocAvatar.nativeElement.files[0].size ;
        this.notificationDocAvatar.nativeElement.value = '';      
    }
  }

  submit(): void {
      const Obj = this.eventForm.value;
      if (Obj.notificationDoc != null && Obj.notificationDoc.split('cms/').length > 0){
          Obj.notificationDoc = Obj.notificationDoc.split('cms/')[1];
      }
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < this.deletedAudiences.length; i++){
        this.notificationAudiences.push(this.deletedAudiences[i]);
      } 
      Obj.notificationAudiences = this.notificationAudiences;
      Obj.collegeId = this.pageParams.collegeId;
      Obj.academicYearId = +this.pageParams.academicYearId;
      if (this.notificationDocAvatar.nativeElement.files.length > 0){
        Obj.notificationDocAvatar = this.notificationDocAvatar;
      }else{
        Obj.notificationDocAvatar = null;
      }
      if (this.eventForm.invalid) {
          return;
      } else {
          if (this.notificationAudiences.length > 0){
            this.spinner.show();
            this.isFile = false;
            this.notification = [];
            Obj.startDate = this.genericFunctions.momentWithDateFormatYMD(Obj.startDate);
            Obj.endDate = this.genericFunctions.momentWithDateFormatYMD(Obj.endDate);
            Obj.publishDate = this.genericFunctions.momentWithDateFormatYMD(Obj.publishDate);
            if ( this.data !== null &&  this.data !== undefined){
            Obj.createdDt = this.data.createdDt;
            Obj.notificationId = this.data.notificationId;
            Obj.startDate = this.genericFunctions.momentWithDateFormatYMD(Obj.startDate);
            Obj.endDate = this.genericFunctions.momentWithDateFormatYMD( Obj.endDate);
            Obj.publishDate = this.genericFunctions.momentWithDateFormatYMD(Obj.publishDate);
        }
            this.notification.push(Obj); 
            this.crudService.add(this.notificationsUrl, this.notification)
        .subscribe(result => {
            this.spinner.hide();
            if (result.success){

                this.formData = new FormData();
                this.formData.append('notificationId', result.data);

                if (Obj.notificationDocAvatar != null){
                    this.formData.append('notificationDoc',
                    Obj.notificationDocAvatar.nativeElement.files[0],
                    Obj.notificationDocAvatar.nativeElement.files[0].name);
                    this.isFile = true;
                }

                if (this.isFile){
                    /*-------- FILE UPLOAD ---------*/ 
                    this.crudService.upload(this.notificationUploadUrl, this.formData)
                    .subscribe(result1 => {
                        this.spinner.hide();
                        if (result1.statusCode === 200){
                            if (result1.data && result1.data !== '') {
                                this.snotifyService.success(result1.message, 'Success!');
                            }
                        }else {
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
                }  

                this.snotifyService.success(result.message, 'Success!');
                this.router.navigate(['admin-examination-management/admin-exam-masters/exam-timetable-notification'], 
             { queryParams: { 
               collegeId:   this.pageParams.collegeId, 
               academicYearId: this.params.academicYearId,
             } });
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
           //  this.dialogRef.close(Obj);
  }else{
            this.snotifyService.info('Add atleast one event audience.', 'Info!');
          }
      }
  }
  
 goBack(): void{
  this.router.navigate(['admin-examination-management/admin-exam-masters/exam-timetable-notification'], 
  { queryParams: { 
    collegeId:   this.pageParams.collegeId, 
    academicYearId: this.params.academicYearId,
  } });
  }

}
