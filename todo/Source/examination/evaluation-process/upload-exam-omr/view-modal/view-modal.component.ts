import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SnotifyService } from 'ng-snotify';

@Component({
  selector: 'app-view-modal',
  templateUrl: './view-modal.component.html',
  styleUrls: ['./view-modal.component.scss']
})
export class ViewModalComponent implements OnInit {

  constructor(private snotifyService: SnotifyService, private dialogRef: MatDialogRef<ViewModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data,) { }

  ngOnInit(): void {
    console.log(this.data);
    
  }

}
