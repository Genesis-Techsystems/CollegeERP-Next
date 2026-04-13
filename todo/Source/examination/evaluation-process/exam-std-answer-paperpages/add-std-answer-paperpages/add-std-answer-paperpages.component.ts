import { Component, OnInit, Inject, ViewChild , ElementRef  } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { Country } from 'app/main/models/country';
import { State } from 'app/main/models/state';
import { District } from 'app/main/models/district';
import { CONSTANTS } from 'app/main/common/constants';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CampusModalComponent } from 'app/main/apps/admin/campus/campus-modal/campus-modal.component';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
import { Subject, ReplaySubject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { storeMaster } from 'app/main/models/store';
import { Organization } from 'app/main/models/organization';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { NgxSpinnerService } from 'ngx-spinner';
import {Location} from '@angular/common';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-add-std-answer-paperpages',
  templateUrl: './add-std-answer-paperpages.component.html',
  styleUrls: ['./add-std-answer-paperpages.component.scss']
})
export class AddStdAnswerPaperpagesComponent implements OnInit {

  answerpaperpages: FormGroup;
  step = 0;
  defaultAcademicYearId;
  public formData;
  studentStaging: any[] = [];
  params: any = {};
  pending: boolean;
  preStaggings: any[] = [];
  wopts: XLSX.WritingOptions = { bookType: 'xlsx', type: 'array' };
  fileName = 'SheetJS.xlsx';
  size;
  @ViewChild('uploadXl') uploadXl: ElementRef;

  constructor(private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<CampusModalComponent>,
    @Inject(MAT_DIALOG_DATA) private data, private snotifyService: SnotifyService, private spinner: NgxSpinnerService,
    private crudService: CrudService, public router: Router) {
// this.getColleges();
}
  ngOnInit(): void {
    this.answerpaperpages = this.formBuilder.group({
      isActive: [],
      reason: [],
    });

    this.answerpaperpages.get('isActive').setValue(true);
  }
  upload(event): void {
    if (event.target.files && event.target.files[0]) {
        const input = event.target;
        const reader = new FileReader();
        this.size = 0;
        reader.onload = (e: any) => {
            const bstr: string = e.target.result;
            const wb: XLSX.WorkBook = XLSX.read(bstr, {type: 'binary'});
            /* grab first sheet */
            const wsname: string = wb.SheetNames[0];
            const ws: XLSX.WorkSheet = wb.Sheets[wsname];
            /* save data */
            this.data = ((XLSX.utils.sheet_to_json(ws, {header: 1})) as any);
            // tslint:disable-next-line:prefer-for-of
            for (let i = 0; i < this.data.length; i++){
               if (this.data[i] !== '' && this.data[i] !== 'undefined'){
                 if (this.data[i].length > 0){
                   this.size = this.size + 1;
                 }
               }
            }
        };
        reader.readAsBinaryString(input.files[0]);
    }
  }

  uploadFile(): void{
  //     if (this.uploadXl.nativeElement.files.length > 0){
  //       this.formData = new FormData();
  //       this.formData.append('file',
  //       this.uploadXl.nativeElement.files[0],
  //       this.uploadXl.nativeElement.files[0].name);
  //       this.spinner.show();
  //       /*-------- FILE UPLOAD ---------*/ 
  //       this.crudService.upload(this.importStudentDetailsUrl, this.formData)
  //       .subscribe(result1 => {
  //           this.spinner.hide();
  //           if (result1.statusCode === 200){
  //               if (result1.success) {
  //                 this.studentStaging = result1.data;
  //                 this.dataSource = new MatTableDataSource<any>(this.studentStaging);
  //                 this.dataSource.paginator = this.paginator;
  //                 this.dataSource.sort = this.sort;
  //                 this.snotifyService.success(result1.message, 'Success!');
  //               }
  //           }else {
  //               this.snotifyService.error(result1.message, 'Error!');
  //           }
  //       }, error => {
  //           this.spinner.hide();
  //           if (error.error.statusCode === 401){
  //               this.snotifyService.error(error.error.message, 'Error!');
  //               this.genericFunctions.logOut(this.router.url);
  //           }else{
  //               this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
  //           }
  //       });
  //     }else{
  //       this.snotifyService.info('Please choose a file.', 'Info!');
  //     }
  // }

}
}