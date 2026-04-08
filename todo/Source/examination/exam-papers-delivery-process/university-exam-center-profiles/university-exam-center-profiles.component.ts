import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
import { AddUnivExamCentersComponent } from '../univ-exam-centers/add-univ-exam-centers/add-univ-exam-centers.component';
import { UpdateExamProfilesComponent } from './update-exam-profiles/update-exam-profiles.component';

@Component({
  selector: 'app-university-exam-center-profiles',
  templateUrl: './university-exam-center-profiles.component.html',
  styleUrls: ['./university-exam-center-profiles.component.scss']
})
export class UniversityExamCenterProfilesComponent implements OnInit {

    displayedColumns: string[] = ['id','roleName', 'evaluatorName','actions'];
    dataSource: MatTableDataSource<any>;
    open: boolean;
    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;
    panelOpenState = true;
    flag=false
    private isActive = CONSTANTS.isActive;
    private UnivExamCentersUrl = CONSTANTS.UnivExamCentersUrl;
    private UnivEcProfilesUrl = CONSTANTS.UnivEcProfilesUrl;
    private ExamEvaluatorsProfileUrl=CONSTANTS.ExamEvaluatorsProfileUrl
    private roleCrudUrl=CONSTANTS.roleCrudUrl
    private addListUnivEcProfilesUrl=CONSTANTS.addListUnivEcProfilesUrl
    universites = [];
    subject: any = {};
    examCenterForm: FormGroup;
    step = 0;
    courseGroupList = [];
    universityCode: any;
    collegecode: string;
    mainList = [];
    updateList: any[];
    universitiesList=[];
    collegesList=[];
    examlCenterList: any[];
    evaluatorProfile=[];
    univExamevaluatorProfileList=[];
    roles = [
        { roleId: 64, roleName: 'Evaluator' },
        { roleId: 67, roleName: 'Moderator' },
        { roleId: 70, roleName: 'QuestionPapersetter' },
        { roleId: 96, roleName: 'External Evaluator' },
        { roleId: 97, roleName: 'Internal Evaluator' },
    
      ];
    rolesData=[];
    examlCenterListData=[];
    selectedCount: number;
    checksubject: any;
    examProfileListdata: any[];
    examcenterCode: any;
    evaluatorProfileList=[];
    roleName: string;
    evaluatorProfileDupList=[];
    //   collegeCode = localStorage.getItem('collegeCode');

    constructor(private dialog: MatDialog,
        private formBuilder: FormBuilder,
        private snotifyService: SnotifyService,
        private router: Router,
        private crudService: CrudService, private spinner: NgxSpinnerService, private genericFunctions: GenericFunctions) {
        this.getData();
    }
    ngOnInit() {
        this.examCenterForm = this.formBuilder.group({
          univExamCentersId: ['', Validators.required],
          profileRoleId: ['', Validators.required],

        });
        this.dataSource = new MatTableDataSource(this.examlCenterList);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    // tslint:disable-next-line:typedef
    applyFilter(filterValue: string) {
        this.dataSource.filter = filterValue.trim().toLowerCase();
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }
  
    getData(): void {
      this.examlCenterList =[]
      this.crudService.listDetailsById(this.UnivExamCentersUrl, 'true',  this.isActive)
          .subscribe(result => {
              if (result.statusCode === 200) {
                  if (result.data.resultList && result.data.resultList !== '') {
                      this.examlCenterList = result.data.resultList;
                      this.examlCenterListData= this.examlCenterList 
                      // this.dataSource = new MatTableDataSource(this.examlCenterList);
                      // this.dataSource.paginator = this.paginator;
                      // this.dataSource.sort = this.sort;

                  } else {
                      this.snotifyService.success(result.message, 'Success!');
                  }
              } else {
                  this.snotifyService.error(result.message, 'Error!');
              }

          }, error => {
              if (error.error.statusCode === 401) {

                  this.snotifyService.error(error.error.message, 'Error!');
                  this.genericFunctions.logOut(this.router.url + '&loadForm=true');
              } else {
                  this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
              }
          });
        //   this.spinner.show();
        //   this.crudService.listDetailsById(this.roleCrudUrl,'true',this.isActive)
        //     .subscribe(result => {
        //       this.spinner.hide();
        //       if (result.statusCode === 200) {
        //         if (result.data.resultList && result.data.resultList !== '') {
        //           this.roles = result.data.resultList;
        //           this.rolesData =  this.roles
                 
        //         } else {
        //           this.snotifyService.success(result.message, 'Success!');
        //         }
        //       } else {
        //         this.snotifyService.error(result.message, 'Error!');
        //       }
        //     }, error => {
        //       this.spinner.hide();
        //       if (error.error.statusCode === 401) {
        //         this.snotifyService.error(error.error.message, 'Error!');
        //         this.genericFunctions.logOut(this.router.url);
        //       } else {
        //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        //       }
        //     });
    }
    selectedRole(profileRoleId) {
        this.crudService.listDetailsByTwoIds(this.ExamEvaluatorsProfileUrl,this.examCenterForm.value.profileRoleId,'true','role.roleId',this.isActive)
        .subscribe(result => {
            this.spinner.hide();
            if (result.statusCode === 200){
                if (result.data && result.data !== '') {
                    this.evaluatorProfile = result.data.resultList;
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
     
      // this.examlCenterList =[]
      //   this.crudService.listDetailsByTwoIds(this.UnivExamCentersUrl, profileRoleId, 'true', 'Universities.universityId', this.isActive)
      //       .subscribe(result => {
      //           if (result.statusCode === 200) {
      //               if (result.data.resultList && result.data.resultList !== '') {
      //                   this.examlCenterList = result.data.resultList;
      //                   this.dataSource = new MatTableDataSource(this.examlCenterList);
      //                   this.dataSource.paginator = this.paginator;
      //                   this.dataSource.sort = this.sort;

      //               } else {
      //                   this.snotifyService.success(result.message, 'Success!');
      //               }
      //           } else {
      //               this.snotifyService.error(result.message, 'Error!');
      //           }

      //       }, error => {
      //           if (error.error.statusCode === 401) {

      //               this.snotifyService.error(error.error.message, 'Error!');
      //               this.genericFunctions.logOut(this.router.url + '&loadForm=true');
      //           } else {
      //               this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
      //           }
      //       });
           
    }
    getEvaluationList(){
        this.examProfileListdata=[]
        // this.evaluatorProfile =[]
        this.univExamevaluatorProfileList=[]
        this.examcenterCode =  this.examlCenterList.filter(x=>(x.univExamcenterId ==this.examCenterForm.value.univExamCentersId))[0]?.examcenterCode
        this.roleName =  this.roles.filter(x=>(x.roleId ==this.examCenterForm.value.profileRoleId))[0]?.roleName
        this.flag=true
        this.spinner.show()
      this.crudService.listDetailsByThreeIds(this.UnivEcProfilesUrl,this.examCenterForm.value.univExamCentersId,this.examCenterForm.value.profileRoleId,'true','univExamCenters.univExamcenterId','profileRole.roleId',this.isActive)
      .subscribe(result => {
          this.spinner.hide();
          if (result.statusCode === 200){
              if (result.data && result.data !== '') {
                  this.univExamevaluatorProfileList = result.data.resultList;
                  this.dataSource = new MatTableDataSource(this.univExamevaluatorProfileList);
                        this.dataSource.paginator = this.paginator;
                        this.dataSource.sort = this.sort;
                  if(this.univExamevaluatorProfileList.length>0 &&  this.evaluatorProfile.length>0){
                    // for (let i = 0; i < this.evaluatorProfile.length; i++) {
                    // for (let index = 0; index < this.univExamevaluatorProfileList.length; index++) {
                    //         if(this.evaluatorProfile[i].examEvaluatorProfileId!=this.univExamevaluatorProfileList[index].examEvaluatorProfilesId){
                    //             console.log(this.evaluatorProfile[i].examEvaluatorProfileId);
                    //             this.evaluatorProfileList.push(this.evaluatorProfile[i])
                    //         }
                            
                    //     }
                        // Step 1: Collect IDs from univExamevaluatorProfileList to exclude
                        const evaluatorIdsToRemove = this.univExamevaluatorProfileList.map(x => x.examEvaluatorProfilesId);

                        // Step 2: Filter evaluatorProfile for items without matching IDs
                        this.evaluatorProfileList = this.evaluatorProfile.filter(
                            profile => !evaluatorIdsToRemove.includes(profile.examEvaluatorProfileId)
                        );
                        this.evaluatorProfileDupList = this.evaluatorProfileList

                        // this.evaluatorProfile=this.evaluatorProfile.filter(x=>(x.examEvaluatorProfileId!=this.univExamevaluatorProfileList[index].examEvaluatorProfilesId))
                        
                    // }
                    // this.evaluatorProfile=this.evaluatorProfile.filter(x=>(x.examEvaluatorProfileId!=this.univExamevaluatorProfileList.filter(x=>(x.examEvaluatorProfilesId))))
                  

                  }
                  else{
                    this.evaluatorProfileList=this.evaluatorProfile
                    this.evaluatorProfileDupList=this.evaluatorProfile

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
      serachRoles(value){
        this.rolesData=[]
        this.serachRolesData(value)
      }
      
      serachRolesData(value: string){
      let filter = value.toLowerCase();
      for ( let i = 0 ; i < this.roles.length; i++ ) {
          let option = this.roles[i];
          if (option.roleName.toLowerCase().indexOf(filter) >= 0) {
              this.rolesData.push( option );
          }
      }
      }
      serachExamCenter(value){
        this.examlCenterListData=[]
        this.serachExamCenterData(value)
      }
      
      serachExamCenterData(value: string){
      let filter = value.toLowerCase();
      for ( let i = 0 ; i < this.examlCenterList.length; i++ ) {
          let option = this.examlCenterList[i];
          if (option.examcenterCode.toLowerCase().indexOf(filter) >= 0) {
              this.examlCenterListData.push( option );
          }
      }
      }
      checkedserialNo(check,item){
        item.isSelected = check;
      this.selectedCount = 0;
      this.examProfileListdata = [];
      for (let i = 0; i < this.evaluatorProfileList.length; i++){
          if (this.evaluatorProfileList[i].isSelected){
            //  this.examProfileListdata.push(this.evaluatorProfile[i]);
            this.examProfileListdata.push({
                evaluatorName:this.evaluatorProfileList[i].evaluatorName,
                examEvaluatorProfilesId:this.evaluatorProfileList[i].examEvaluatorProfileId,
                profileRoleId:this.examCenterForm.value.profileRoleId,
                univExamCentersId:this.examCenterForm.value.univExamCentersId,
                isActive:true,
                reason:null
            
            });
             this.selectedCount++;
          }
          else{
    
          }
      }
      }
      markItems(): void{
      this.selectedCount = 0;
      this.examProfileListdata = [];
        for(let i=0;i<this.evaluatorProfileList.length;i++){
          if (this.checksubject){
            this.evaluatorProfileList[i].checked = true;
            this.evaluatorProfileList[i].isSelected = true;
            this.examProfileListdata.push({
                evaluatorName:this.evaluatorProfileList[i].evaluatorName,
                examEvaluatorProfilesId:this.evaluatorProfileList[i].examEvaluatorProfileId,
                profileRoleId:this.examCenterForm.value.profileRoleId,
                univExamCentersId:this.examCenterForm.value.univExamCentersId,
                isActive:true,
                reason:null
            
            });
            this.selectedCount++;
          
          }else{
            this.evaluatorProfile[i].checked = false;
            this.evaluatorProfile[i].isSelected = false;
            this.checksubject=false
            this.examProfileListdata=[]
            // this.examStudentList1=[]
          }
       }
      
      }
Assign(){
    this.spinner.show();
    this.crudService.add(this.addListUnivEcProfilesUrl, this.examProfileListdata)
    .subscribe(result => {
        this.spinner.hide();
        if (result.statusCode === 200){
            if (result.data && result.data !== '') {
                this.snotifyService.success(result.message, 'Success!');
                this.getEvaluationList();
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
searchProfile(value) {
    this.evaluatorProfileDupList = []
    this.searchProfiles(value);
  }
  searchProfiles(value: string) {
    let filter = value.toLowerCase();
    for (let i = 0; i < this.evaluatorProfileList.length; i++) {
      let option = this.evaluatorProfileList[i];
      if (option.evaluatorName.toLowerCase().indexOf(filter) >= 0) {
        this.evaluatorProfileDupList.push(option);
      }
  
    }
  }
    editDialog(row) {
        const dialogRef = this.dialog.open(UpdateExamProfilesComponent, {
            width: '750px',
            data: row
        });

        dialogRef.afterClosed().subscribe(details => {
            if (details != null && details !== '') {
                details.univEcPorifleId=row.univEcPorifleId
                details.examEvaluatorProfilesId=row.examEvaluatorProfilesId
                details.profileRoleId=row.profileRoleId
                this.updateData(details)
            }
        });
    }
    updateData(updateList) {
      this.spinner.show();
        this.crudService.updateDetails(this.UnivEcProfilesUrl, updateList,updateList.univEcPorifleId,'univEcPorifleId')
            .subscribe(result => {
                this.spinner.hide();
                if (result.statusCode === 200) {
                    if (result.success) {
                        this.snotifyService.success(result.message, 'Success!');
                    } else {
                        this.snotifyService.info(result.message, 'Info!');
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
