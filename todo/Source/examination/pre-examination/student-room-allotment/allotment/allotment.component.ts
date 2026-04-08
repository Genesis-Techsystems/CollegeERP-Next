import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { NgxSpinnerService } from 'ngx-spinner';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router, ActivatedRoute } from '@angular/router';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import {Location} from '@angular/common';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-allotment',
  templateUrl: './allotment.component.html',
  styleUrls: ['./allotment.component.scss']
})

export class AllotmentComponent implements OnInit  {

  panelOpenState = true;
  data: any = {};
  array1: any[] = [];

  constructor(private formBuilder: FormBuilder, private snotifyService: SnotifyService,
              private crudService: CrudService, private spinner: NgxSpinnerService, private router: Router,
              private dialog: MatDialog, private genericFunctions: GenericFunctions, private route: ActivatedRoute,
              private storage: LocalStorage, private _location: Location) {

  }

  // tslint:disable-next-line:typedef
  ngOnInit() {
          this.storage.getItem('item').pipe(
            catchError(() => of()
            ),
          ).subscribe((result) => {
            console.log(result);
            this.data = result;
            // tslint:disable-next-line: prefer-for-of
            for (let i = 0; i < this.data.selectedRooms.length; i++){
              this.data.selectedRooms[i].array = [];
              for (let j = 0; j < this.data.selectedRooms[i].totalRows; j++){
                  this.array1 = [];
                  this.data.selectedRooms[i].array.push({
                    value: j + 1,
                    cols: this.count(this.data.selectedRooms[i], j + 1),
                  });
              }
            }
            console.log(this.data.selectedRooms);
          });
  }

  count(room, n): any{
    if (room.examRoomStudentAllotmentDTO.filter(x => (x.rowNo === n)).length > 0){
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < room.examRoomStudentAllotmentDTO.filter(x => (x.rowNo === n)).length; i++){
            room.examRoomStudentAllotmentDTO.filter(x => (x.rowNo === n))[i].value = room.examRoomStudentAllotmentDTO.filter(x => (x.rowNo === n))[i].columnNo;
            this.array1.push(room.examRoomStudentAllotmentDTO.filter(x => (x.rowNo === n))[i]);
        }
    }
    return this.array1;
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
  }

  addSeat(data): void{
     console.log(data);
  }

  goBack(): void {
      // this.router.navigate(['admin-examination-management/exam-masters/seating-plan-setup'], {
      //     queryParams: {
      //         collegeId: this.pageParams.collegeId,
      //         examId: this.pageParams.examId
      //     }
      // });
      this._location.back();
  }

}
